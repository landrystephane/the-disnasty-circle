'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface TicketTier {
  id?: string
  name: string
  price: string
  endDate: string
}

export default function EditSoiree() {
  const router = useRouter()
  const params = useParams()
  const eventId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    date: '',
    timeStart: '',
    location: '',
    description: '',
    posterUrl: '',
    dressCode: '',
    includes: '',
    whatsappNumber: '',
    status: 'ACTIVE',
  })

  const [tiers, setTiers] = useState<TicketTier[]>([])

  const loadEvent = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/events?id=${eventId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Soirée introuvable.')

      let dateFormatted = ''
      if (data.date) {
        const d = new Date(data.date)
        const offset = d.getTimezoneOffset() * 60000
        dateFormatted = new Date(d.getTime() - offset).toISOString().slice(0, 16)
      }

      let includesText = ''
      if (data.includes) {
        try {
          const parsed = JSON.parse(data.includes)
          includesText = Array.isArray(parsed) ? parsed.join('\n') : data.includes
        } catch {
          includesText = data.includes
        }
      }

      setForm({
        title: data.title || '',
        subtitle: data.subtitle || '',
        date: dateFormatted,
        timeStart: data.timeStart || '20h',
        location: data.location || '',
        description: data.description || '',
        posterUrl: data.posterUrl || '',
        dressCode: data.dressCode || 'Tenue élégante exigée',
        includes: includesText,
        whatsappNumber: data.whatsappNumber || '+33753304120',
        status: data.status || 'ACTIVE',
      })

      if (Array.isArray(data.ticketPhases) && data.ticketPhases.length > 0) {
        setTiers(
          data.ticketPhases.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: String(p.price),
            endDate: p.endDate
              ? new Date(new Date(p.endDate).getTime() - new Date(p.endDate).getTimezoneOffset() * 60000)
                  .toISOString()
                  .slice(0, 16)
              : '',
          }))
        )
      } else {
        setTiers([{ name: 'Entrée standard', price: '40', endDate: '' }])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  function addTier() {
    setTiers(prev => [
      ...prev,
      { name: `Tarif Vague ${prev.length + 1}`, price: '45', endDate: '' },
    ])
  }

  function removeTier(index: number) {
    if (tiers.length <= 1) return
    setTiers(prev => prev.filter((_, i) => i !== index))
  }

  function updateTier(index: number, field: keyof TicketTier, val: string) {
    setTiers(prev => prev.map((t, i) => (i === index ? { ...t, [field]: val } : t)))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const data = new FormData()
      data.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur upload.')

      setForm(f => ({ ...f, posterUrl: json.url }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur upload.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          ...form,
          phases: tiers.map(t => ({
            name: t.name,
            price: parseFloat(t.price) || 40,
            endDate: t.endDate || null,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur modification.')

      setSuccess('Soirée mise à jour avec succès !')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmation = confirm(`Êtes-vous sûr de vouloir supprimer définitivement la soirée « ${form.title} » ?\n\nCette action est irréversible.`)
    if (!confirmation) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/events?id=${eventId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erreur lors de la suppression.')

      router.push('/staff/soirees')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur suppression.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <span className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
        <p>Chargement des détails de la soirée...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '950px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/staff/soirees" className="btn btn-outline btn-sm">
            ← Retour aux soirées
          </Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--text)', margin: 0 }}>
              Modifier la Soirée
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Édition des informations, de l&apos;affiche, des tarifs et de la description.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-outline btn-sm"
          style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.5)' }}
        >
          {deleting ? 'Suppression...' : '🗑️ Supprimer cette soirée'}
        </button>
      </div>

      {success && (
        <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(46, 204, 113, 0.15)', border: '1px solid #2ecc71', color: '#2ecc71', borderRadius: '8px', marginBottom: '1.5rem' }}>
          ✅ {success}
        </div>
      )}

      {error && (
        <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(231,76,60,0.15)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '8px', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="card" style={{ padding: '2.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* SECTION 1: INFOS GÉNÉRALES */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              1. Informations Générales
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Titre de la soirée *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thème / Slogan</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Date de la soirée *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Heure de début</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.timeStart}
                  onChange={e => setForm(f => ({ ...f, timeStart: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lieu & Adresse *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: FLYER */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              2. Affiche / Flyer Officiel
            </h3>

            <div style={{
              border: '2px dashed var(--gold-border)',
              borderRadius: '12px',
              padding: '1.75rem',
              textAlign: 'center',
              background: 'rgba(212, 175, 55, 0.02)',
            }}>
              {form.posterUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={form.posterUrl}
                    alt="Aperçu flyer"
                    style={{
                      maxHeight: '260px',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-md)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                      {uploading ? 'Téléversement...' : 'Remplacer l\'affiche'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        disabled={uploading}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, posterUrl: '' }))}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.4)' }}
                    >
                      Supprimer l&apos;affiche
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🖼️</div>
                  <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.3rem' }}>
                    Téléversez le flyer de votre soirée
                  </p>
                  <label className="btn btn-gold btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                    {uploading ? 'Téléversement...' : '📁 Choisir un fichier'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: DESCRIPTION */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              3. Description & Univers de la Soirée
            </h3>

            <div className="form-group">
              <label className="form-label">Texte de présentation détaillé</label>
              <textarea
                className="form-input"
                rows={5}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ lineHeight: '1.6' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Dress Code exigé</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.dressCode}
                  onChange={e => setForm(f => ({ ...f, dressCode: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prestations incluses (une par ligne)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.includes}
                  onChange={e => setForm(f => ({ ...f, includes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: PALIERS TARIFAIRES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', margin: 0 }}>
                4. Paliers Tarifaires & Dates Limites
              </h3>
              <button
                type="button"
                onClick={addTier}
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--gold)', borderColor: 'var(--gold-border)' }}
              >
                + Ajouter un palier
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1.5fr auto',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Nom du tarif</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tier.name}
                      onChange={e => updateTier(index, 'name', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Prix (€)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="form-input"
                      value={tier.price}
                      onChange={e => updateTier(index, 'price', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Disponible jusqu&apos;au</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={tier.endDate}
                      onChange={e => updateTier(index, 'endDate', e.target.value)}
                    />
                  </div>

                  <div style={{ paddingTop: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => removeTier(index)}
                      disabled={tiers.length <= 1}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: CONTACT & STATUT */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              5. Paramètres & Statut
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Numéro WhatsApp *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.whatsappNumber}
                  onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Statut des réservations</label>
                <select
                  className="form-input form-select"
                  style={{ backgroundColor: '#141414', color: '#F5F0E8' }}
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="ACTIVE">🟢 Réservations Ouvertes</option>
                  <option value="CLOSED">🔒 Réservations Clôturées (Complet)</option>
                  <option value="ARCHIVED">📦 Archivée (Non visible sur le site)</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-gold btn-lg" disabled={saving || uploading} style={{ flex: 1 }}>
              {saving ? 'Enregistrement en cours...' : '💾 Enregistrer les modifications'}
            </button>
            <Link href="/staff/soirees" className="btn btn-outline btn-lg">
              Annuler
            </Link>
          </div>

        </form>
      </div>
    </div>
  )
}
