'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { detectCountryFromPhone, STAFF_MEMBERS } from '@/lib/staffContacts'

interface Reservation {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  ticketCount: number
  wantsMask: boolean
  maskCount: number
  status: string
  totalAmount: number | null
  createdAt: string
  notes?: string | null
  event: { title: string; slug: string; whatsappNumber: string }
  phase: { name: string; price: number } | null
  tickets: { id: string; qrCode: string; isUsed: boolean; sentAt: string | null }[]
}

interface ModalInfo {
  open: boolean
  title: string
  message: string
  ticketUrl?: string
  qrCode?: string
  clientPhone?: string | null
  clientName?: string
  eventTitle?: string
}

export default function StaffReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'>('ALL')
  const [countryFilter, setCountryFilter] = useState<'ALL' | 'BE' | 'DE' | 'FR' | 'OTHER'>('ALL')
  const [search, setSearch] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [infoModal, setInfoModal] = useState<ModalInfo | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reservations')
      const data = await res.json()
      if (Array.isArray(data)) setReservations(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setReservations(prev =>
          prev.map(r => (r.id === id ? { ...r, status: newStatus } : r))
        )
        setSuccessMsg(`Statut mis à jour : ${newStatus}`)
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function sendTicket(reservationId: string) {
    setSendingId(reservationId)
    try {
      const res = await fetch('/api/tickets/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      })
      const data = await res.json()
      if (res.ok) {
        await loadData()
        if (data.isMockEmail) {
          setInfoModal({
            open: true,
            title: '🎟️ Billet et QR Code générés !',
            message: `Le billet d'entrée et son code QR ont été générés pour ${data.email}.\n\nMode simulation actif. Le billet est 100% prêt et valide : vous pouvez cliquer sur « 👁️ Voir le billet » ou lui envoyer directement le lien par WhatsApp !`,
            ticketUrl: data.ticketUrl,
            qrCode: data.qrCode,
            clientPhone: data.phone,
          })
        } else {
          setSuccessMsg(`✓ Billet envoyé par email avec succès à ${data.email} !`)
          setTimeout(() => setSuccessMsg(null), 4000)
        }
      } else {
        alert(data.error || 'Erreur lors de l\'envoi du billet.')
      }
    } catch (err) {
      alert('Erreur réseau lors de l\'envoi du billet.')
    } finally {
      setSendingId(null)
    }
  }

  function getClientWhatsAppChatUrl(r: Reservation) {
    const rawPhone = r.phone || ''
    const cleanPhone = rawPhone.replace(/\D/g, '')
    if (!cleanPhone) return null
    const msg = encodeURIComponent(
      `Bonjour ${r.firstName} ${r.lastName},\n\nC'est l'équipe THE DISNASTY CIRCLE concernant votre réservation pour *${r.event.title}* (${r.ticketCount} place(s) - Total: ${r.totalAmount ?? '...'}€).\n\nVotre réservation est bien enregistrée !`
    )
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`
  }

  function getClientTicketShareUrl(r: Reservation, qrCode: string) {
    const rawPhone = r.phone || ''
    const cleanPhone = rawPhone.replace(/\D/g, '')
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const ticketUrl = `${origin}/billet/${qrCode}`
    const msg = encodeURIComponent(
      `Bonjour ${r.firstName} ! Voici votre e-billet officiel THE DISNASTY CIRCLE pour *${r.event.title}* :\n\n🔗 ${ticketUrl}\n\nVeuillez présenter ce QR code à l'accueil lors de votre arrivée. À très bientôt !`
    )
    return cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`
      : `https://api.whatsapp.com/send?text=${msg}`
  }

  const beCount = reservations.filter(r => (r.phone || '').replace(/\D/g, '').startsWith('32')).length
  const deCount = reservations.filter(r => (r.phone || '').replace(/\D/g, '').startsWith('49')).length
  const frCount = reservations.filter(r => (r.phone || '').replace(/\D/g, '').startsWith('33')).length
  const otherCount = reservations.length - (beCount + deCount + frCount)

  const filtered = reservations.filter(r => {
    const matchFilter = filter === 'ALL' || r.status === filter
    const cleanPhone = (r.phone || '').replace(/\D/g, '')
    const matchCountry =
      countryFilter === 'ALL' ||
      (countryFilter === 'BE' && cleanPhone.startsWith('32')) ||
      (countryFilter === 'DE' && cleanPhone.startsWith('49')) ||
      (countryFilter === 'FR' && cleanPhone.startsWith('33')) ||
      (countryFilter === 'OTHER' && !cleanPhone.startsWith('32') && !cleanPhone.startsWith('49') && !cleanPhone.startsWith('33'))

    const query = search.toLowerCase()
    const matchSearch =
      !search ||
      r.firstName.toLowerCase().includes(query) ||
      r.lastName.toLowerCase().includes(query) ||
      r.email.toLowerCase().includes(query) ||
      (r.phone && r.phone.includes(query))
    return matchFilter && matchCountry && matchSearch
  })

  return (
    <div style={{ maxWidth: '1400px', width: '100%' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--text)' }}>
            Gestion des Réservations
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {reservations.length} réservation(s) au total • Équipe Staff : 🇧🇪 Belgique, 🇩🇪 Allemagne, 🇫🇷 France
          </p>
        </div>
        <button onClick={loadData} className="btn btn-outline btn-sm">
          🔄 Actualiser
        </button>
      </div>

      {successMsg && (
        <div style={{
          padding: '0.8rem 1.2rem',
          background: 'rgba(46, 204, 113, 0.15)',
          border: '1px solid #2ecc71',
          color: '#2ecc71',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          ✅ {successMsg}
        </div>
      )}

      {/* COUNTRY TABS (Pour les 3 membres du staff) */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        padding: '0.75rem 1rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginRight: '0.5rem' }}>
          Filtrer par Pays Référent :
        </span>
        <button
          onClick={() => setCountryFilter('ALL')}
          className={`btn btn-sm ${countryFilter === 'ALL' ? 'btn-gold' : 'btn-outline'}`}
        >
          Tous les pays ({reservations.length})
        </button>
        <button
          onClick={() => setCountryFilter('BE')}
          className={`btn btn-sm ${countryFilter === 'BE' ? 'btn-gold' : 'btn-outline'}`}
        >
          🇧🇪 Belgique ({beCount})
        </button>
        <button
          onClick={() => setCountryFilter('DE')}
          className={`btn btn-sm ${countryFilter === 'DE' ? 'btn-gold' : 'btn-outline'}`}
        >
          🇩🇪 Allemagne ({deCount})
        </button>
        <button
          onClick={() => setCountryFilter('FR')}
          className={`btn btn-sm ${countryFilter === 'FR' ? 'btn-gold' : 'btn-outline'}`}
        >
          🇫🇷 France ({frCount})
        </button>
        {otherCount > 0 && (
          <button
            onClick={() => setCountryFilter('OTHER')}
            className={`btn btn-sm ${countryFilter === 'OTHER' ? 'btn-gold' : 'btn-outline'}`}
          >
            🌍 Autres ({otherCount})
          </button>
        )}
      </div>

      {/* STATUT & RECHERCHE */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`btn btn-sm ${filter === tab ? 'btn-gold' : 'btn-outline'}`}
            >
              {tab === 'ALL' && 'Toutes'}
              {tab === 'PENDING' && '⏳ En attente'}
              {tab === 'CONFIRMED' && '✅ Confirmées'}
              {tab === 'CANCELLED' && '❌ Annulées'}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Rechercher nom, email, tél..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
          style={{ maxWidth: '320px' }}
        />
      </div>

      {/* TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 1rem' }} />
            <p>Chargement des réservations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Aucune réservation trouvée pour ces critères.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <th style={{ padding: '1rem' }}>Client & Pays</th>
                  <th style={{ padding: '1rem' }}>Soirée & Billets</th>
                  <th style={{ padding: '1rem' }}>Total</th>
                  <th style={{ padding: '1rem' }}>Statut</th>
                  <th style={{ padding: '1rem' }}>Billets QR</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const sentCount = r.tickets.filter(t => t.sentAt).length
                  const chatUrl = getClientWhatsAppChatUrl(r)
                  const firstTicket = r.tickets[0]
                  const country = detectCountryFromPhone(r.phone)

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {/* Client */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{country.flag}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {r.firstName} {r.lastName}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                          📧 {r.email}
                        </div>
                        {r.phone && (
                          <div style={{ color: 'var(--gold)', fontSize: '0.82rem', marginTop: '0.15rem', fontWeight: 500 }}>
                            📱 {r.phone}
                          </div>
                        )}
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          {new Date(r.createdAt).toLocaleDateString('fr-FR')} {new Date(r.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Soirée & Billets */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ color: 'var(--gold)', fontWeight: 500 }}>
                          {r.event.title}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {r.ticketCount}x {r.phase?.name ?? 'Standard'}
                        </div>
                        {(r.maskCount > 0 || r.wantsMask) && (
                          <div style={{ color: 'var(--gold)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                            🎭 {r.maskCount > 0 ? `${r.maskCount} masque(s)` : 'Masque inclus'}
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--gold)' }}>
                        {r.totalAmount != null ? `${r.totalAmount}€` : '—'}
                      </td>

                      {/* Statut */}
                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${
                          r.status === 'CONFIRMED' ? 'badge-success' :
                          r.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {r.status === 'CONFIRMED' ? 'Confirmé' :
                           r.status === 'CANCELLED' ? 'Annulé' : 'En attente'}
                        </span>
                      </td>

                      {/* Billets QR */}
                      <td style={{ padding: '1rem' }}>
                        {firstTicket ? (
                          <div>
                            <span style={{ color: '#2ecc71', fontSize: '0.82rem', fontWeight: 600, display: 'block' }}>
                              ✓ QR Généré ({r.tickets.length})
                            </span>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                              Ref: {firstTicket.qrCode.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                            Non généré
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {/* Chat direct avec le numéro du client */}
                          {chatUrl ? (
                            <a
                              href={chatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ color: '#25D366', borderColor: 'rgba(37,211,102,0.4)', padding: '0.35rem 0.6rem' }}
                              title="Discuter directement avec le client sur son WhatsApp"
                            >
                              💬 Chat WA
                            </a>
                          ) : (
                            <button
                              onClick={() => alert(`Ce client n'a pas renseigné de numéro de téléphone.`)}
                              className="btn btn-outline btn-sm"
                              style={{ opacity: 0.4, padding: '0.35rem 0.6rem' }}
                              title="Pas de téléphone"
                            >
                              💬 Chat WA
                            </button>
                          )}

                          {/* Voir le billet si généré */}
                          {firstTicket && (
                            <>
                              <Link
                                href={`/billet/${firstTicket.qrCode}`}
                                target="_blank"
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--gold)', borderColor: 'var(--gold-border)', padding: '0.35rem 0.6rem' }}
                                title="Voir, imprimer ou enregistrer en PDF"
                              >
                                👁️ Billet
                              </Link>

                              <a
                                href={getClientTicketShareUrl(r, firstTicket.qrCode)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-whatsapp btn-sm"
                                style={{ padding: '0.35rem 0.6rem' }}
                                title="Envoyer le lien du billet sur le WhatsApp du client"
                              >
                                📲 Billet WA
                              </a>
                            </>
                          )}

                          {/* Générer / envoyer email */}
                          <button
                            onClick={() => sendTicket(r.id)}
                            disabled={sendingId === r.id}
                            className="btn btn-gold btn-sm"
                            style={{ padding: '0.35rem 0.7rem' }}
                            title="Générer le billet QR et envoyer par email"
                          >
                            {sendingId === r.id ? '...' : (firstTicket ? '✉️ Renvoyer' : '🎟️ Créer billet')}
                          </button>

                          {/* Statut check/cross */}
                          {r.status !== 'CONFIRMED' && (
                            <button
                              onClick={() => updateStatus(r.id, 'CONFIRMED')}
                              className="btn btn-outline btn-sm"
                              style={{ color: '#2ecc71', borderColor: 'rgba(46,204,113,0.3)', padding: '0.35rem 0.5rem' }}
                              title="Confirmer la réservation"
                            >
                              ✓
                            </button>
                          )}

                          {r.status !== 'CANCELLED' && (
                            <button
                              onClick={() => updateStatus(r.id, 'CANCELLED')}
                              className="btn btn-outline btn-sm"
                              style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', padding: '0.35rem 0.5rem' }}
                              title="Annuler la réservation"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL INFORMATION BILLET */}
      {infoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#141414',
            border: '2px solid var(--gold)',
            borderRadius: '14px',
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--gold)', margin: '0 0 1rem' }}>
              {infoModal.title}
            </h3>
            <p style={{ whiteSpace: 'pre-line', color: 'var(--text)', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 1.5rem' }}>
              {infoModal.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {infoModal.ticketUrl && (
                <Link
                  href={infoModal.ticketUrl}
                  target="_blank"
                  className="btn btn-gold"
                  onClick={() => setInfoModal(null)}
                >
                  👁️ Ouvrir le billet & QR Code
                </Link>
              )}
              <button
                onClick={() => setInfoModal(null)}
                className="btn btn-outline"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
