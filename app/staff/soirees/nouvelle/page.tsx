'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TicketTier {
  name: string
  price: string
  endDate: string // Date limite de disponibilité à ce prix
}

export default function NouvelleSoiree() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    date: '',
    timeStart: '20h00',
    location: 'Paris',
    description: '',
    posterUrl: '',
    dressCode: 'Tenue élégante exigée',
    includes: 'Boisson offerte\nPetite restauration',
    whatsappNumber: '+33753304120',
  })

  // Multi-phase ticketing state
  const [tiers, setTiers] = useState<TicketTier[]>([
    { name: 'Early Bird', price: '35', endDate: '' },
    { name: 'Entrée Standard', price: '40', endDate: '' },
  ])

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

  // Handle direct file upload for flyer
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
      if (!res.ok) throw new Error(json.error || 'Erreur lors de l\'envoi du fichier.')

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
    setLoading(true)

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phases: tiers.map(t => ({
            name: t.name,
            price: parseFloat(t.price) || 40,
            endDate: t.endDate || null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création.')

      router.push('/staff/soirees')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '950px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/staff/soirees" className="btn btn-outline btn-sm">
          ← Retour aux soirées
        </Link>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--text)', margin: 0 }}>
            Créer & Publier une Soirée
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Configurez les détails, l&apos;affiche, la description et les paliers tarifaires.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* SECTION 1: IDENTITÉ DE LA SOIRÉE */}
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
                  placeholder="Ex: Gala Impérial, Soirée Blanche, Bal Masqué..."
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
                  placeholder="Ex: ÉLÉGANCE • PRESTIGE • CHAMPAGNE"
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
                  placeholder="20h00"
                  value={form.timeStart}
                  onChange={e => setForm(f => ({ ...f, timeStart: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lieu & Adresse *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Hôtel Particulier, Paris 8ème"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: FLYER / AFFICHE UPLOAD */}
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
              position: 'relative',
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
                      border: '1px solid var(--border)'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gold)' }}>✅ Affiche chargée avec succès</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, posterUrl: '' }))}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.4)' }}
                    >
                      Changer d&apos;affiche
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🖼️</div>
                  <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.3rem' }}>
                    Téléversez le flyer ou l&apos;affiche de votre soirée
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                    Formats acceptés : JPG, PNG, WEBP (Fichiers haute résolution recommandés)
                  </p>

                  <label className="btn btn-gold btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                    {uploading ? 'Téléversement en cours...' : '📁 Choisir un fichier sur mon ordinateur'}
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

          {/* SECTION 3: DESCRIPTION COMPLÈTE */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              3. Description de la Soirée
            </h3>

            <div className="form-group">
              <label className="form-label">
                Texte de présentation (qui s&apos;affichera sur la page de la soirée)
              </label>
              <textarea
                className="form-input"
                rows={5}
                placeholder="Décrivez l'univers de la soirée, les artistes, les animations prévues, l'expérience VIP... Vous pouvez sauter des lignes pour créer des paragraphes."
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
                  placeholder="Ex: Tenue de gala, Chic & Masqué, Black Tie..."
                  value={form.dressCode}
                  onChange={e => setForm(f => ({ ...f, dressCode: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prestations incluses (une par ligne)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Coupe de champagne offerte&#10;Petite restauration&#10;Vestiaire inclus"
                  value={form.includes}
                  onChange={e => setForm(f => ({ ...f, includes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: PALIERS TARIFAIRES (EARLY BIRD / DATES LIMITES) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', margin: 0 }}>
                4. Paliers Tarifaires & Dates de Validité
              </h3>
              <button
                type="button"
                onClick={addTier}
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--gold)', borderColor: 'var(--gold-border)' }}
              >
                + Ajouter un palier (ex: Early Bird)
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Configurez des billets à tarif réduit disponibles avant une date précise. Dès que la date est dépassée, le site bascule automatiquement au palier suivant.
            </p>

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
                      placeholder="Ex: Early Bird, Standard, VIP..."
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
                      placeholder="40"
                      value={tier.price}
                      onChange={e => updateTier(index, 'price', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      Disponible jusqu&apos;au (date limite)
                    </label>
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
                      title="Supprimer ce palier"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: CONTACT WHATSAPP */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              5. Contact WhatsApp de Réception
            </h3>

            <div className="form-group" style={{ maxWidth: '400px' }}>
              <label className="form-label">Numéro WhatsApp *</label>
              <input
                type="text"
                className="form-input"
                value={form.whatsappNumber}
                onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                required
              />
              <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                Ce numéro recevra les réservations pré-remplies des invités pour cette soirée.
              </p>
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.8rem', background: 'rgba(231,76,60,0.15)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-gold btn-lg" disabled={loading || uploading} style={{ flex: 1 }}>
              {loading ? 'Publication en cours...' : '✨ Publier la soirée sur THE DISNASTY CIRCLE'}
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
