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
  isTable?: boolean
  tableName?: string | null
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
  const [filter, setFilter] = useState<'ALL' | 'TABLES' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'>('ALL')
  const [countryFilter, setCountryFilter] = useState<'ALL' | 'BE' | 'DE' | 'FR' | 'OTHER'>('ALL')
  const [search, setSearch] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [infoModal, setInfoModal] = useState<ModalInfo | null>(null)

  // Modale Table VIP
  const [tableModal, setTableModal] = useState<{
    open: boolean
    reservation: Reservation | null
    tableName: string
    totalAmount: string
    ticketCount: string
    maskCount: string
    isSaving: boolean
  }>({
    open: false,
    reservation: null,
    tableName: '',
    totalAmount: '',
    ticketCount: '4',
    maskCount: '0',
    isSaving: false,
  })

  // Modale d'envoi groupé (Broadcast)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)

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
    if (newStatus === 'CANCELLED') {
      const ok = window.confirm(
        '⚠️ Êtes-vous sûr de vouloir ANNULER cette réservation ?\n\n' +
        '• Le billet et son code QR seront IMMÉDIATEMENT désactivés.\n' +
        '• Le scanner rejettera l\'accès à l\'entrée.\n' +
        '• Les places seront libérées du quota de la soirée.\n\n' +
        'Confirmer l\'annulation ?'
      )
      if (!ok) return
    }

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
        setSuccessMsg(`Statut mis à jour : ${newStatus === 'CANCELLED' ? '❌ Annulée' : '✅ Confirmée'}`)
        setTimeout(() => setSuccessMsg(null), 3500)
      } else {
        alert('Erreur lors de la mise à jour du statut.')
      }
    } catch (err) {
      console.error(err)
      alert('Erreur réseau lors de la mise à jour.')
    }
  }

  function handleRestoreReservation(id: string) {
    const pin = window.prompt(
      '🔒 Déverrouillage sécurisé\n\nEntrez le code PIN administrateur pour restaurer cette réservation annulée :'
    )
    if (!pin) return

    const normalizedPin = pin.trim().toUpperCase()
    if (normalizedPin !== 'DISNASTY2026' && normalizedPin !== 'DYNASTY2026' && normalizedPin !== 'TDC2026') {
      alert('❌ Code PIN incorrect. Action refusée.')
      return
    }

    updateStatus(id, 'CONFIRMED')
  }

  function openTableModal(r: Reservation) {
    setTableModal({
      open: true,
      reservation: r,
      tableName: r.tableName && r.tableName !== 'Table VIP (En attente)' ? r.tableName : 'Table Carré Or #1',
      totalAmount: r.totalAmount != null ? String(r.totalAmount) : '',
      ticketCount: String(r.ticketCount || 4),
      maskCount: String(r.maskCount || 0),
      isSaving: false,
    })
  }

  async function handleSaveTableModal(e: React.FormEvent) {
    e.preventDefault()
    if (!tableModal.reservation) return

    setTableModal(prev => ({ ...prev, isSaving: true }))
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tableModal.reservation.id,
          status: 'CONFIRMED',
          isTable: true,
          tableName: tableModal.tableName.trim() || 'Table VIP',
          totalAmount: parseFloat(tableModal.totalAmount) || 0,
          ticketCount: parseInt(tableModal.ticketCount, 10) || 1,
          maskCount: parseInt(tableModal.maskCount, 10) || 0,
        }),
      })

      if (res.ok) {
        await loadData()
        setSuccessMsg(`✓ Table VIP « ${tableModal.tableName} » configurée et confirmée !`)
        setTimeout(() => setSuccessMsg(null), 4000)
        setTableModal(prev => ({ ...prev, open: false }))
      } else {
        alert('Erreur lors de la validation de la table.')
      }
    } catch {
      alert('Erreur réseau lors de la validation de la table.')
    } finally {
      setTableModal(prev => ({ ...prev, isSaving: false }))
    }
  }

  async function sendTicket(reservationId: string, alreadySentDate?: string | null) {
    if (alreadySentDate) {
      const formattedDate = new Date(alreadySentDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      const ok = window.confirm(
        `ℹ️ Ce billet a déjà été envoyé au client le ${formattedDate}.\n\n` +
        `Rappel important :\n` +
        `Le code QR est strictement à USAGE UNIQUE (il ne permettra qu'une seule entrée au scan).\n\n` +
        `Voulez-vous quand même renvoyer une copie de courtoisie par email ?`
      )
      if (!ok) return
    }

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

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      alert('Veuillez renseigner le sujet et le message.')
      return
    }

    const confirmedCount = reservations.filter(r => r.status === 'CONFIRMED').length
    const ok = window.confirm(
      `📢 Confirmation d'envoi groupé\n\n` +
      `Cet email sera envoyé à l'ensemble des ${confirmedCount} invité(s) dont la réservation est confirmée.\n\n` +
      `Sujet : « ${broadcastSubject} »\n\n` +
      `Voulez-vous lancer l'envoi maintenant ?`
    )
    if (!ok) return

    setBroadcastSending(true)
    try {
      const res = await fetch('/api/tickets/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: broadcastSubject,
          message: broadcastMessage,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(
          `✓ Envoi groupé terminé !\n\n` +
          `• Destinataires : ${data.sentCount ?? data.count ?? 0}\n` +
          (data.isMock ? `• Note : Mode simulation actif.` : `• Statut : Emails délivrés.`)
        )
        setBroadcastOpen(false)
        setBroadcastSubject('')
        setBroadcastMessage('')
      } else {
        alert(data.error || 'Erreur lors de l\'envoi groupé.')
      }
    } catch {
      alert('Erreur réseau lors de l\'envoi.')
    } finally {
      setBroadcastSending(false)
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
      `Bonjour ${r.firstName} ! Voici votre e-billet officiel THE DISNASTY CIRCLE pour *${r.event.title}* :\n\n🔗 ${ticketUrl}\n\nVeuillez présenter ce QR code à l'accueil lors de votre arrivée (validité : 1 entrée unique). À très bientôt !`
    )
    return cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`
      : `https://api.whatsapp.com/send?text=${msg}`
  }

  const activeReservations = reservations.filter(r => r.status !== 'CANCELLED')
  const activeTicketsCount = activeReservations.reduce((sum, r) => sum + r.ticketCount, 0)
  const cancelledCount = reservations.filter(r => r.status === 'CANCELLED').length

  const beCount = activeReservations.filter(r => (r.phone || '').replace(/\D/g, '').startsWith('32')).length
  const deCount = activeReservations.filter(r => (r.phone || '').replace(/\D/g, '').startsWith('49')).length
  const frCount = activeReservations.filter(r => (r.phone || '').replace(/\D/g, '').startsWith('33')).length
  const otherCount = activeReservations.length - (beCount + deCount + frCount)

  const filtered = reservations.filter(r => {
    const matchFilter =
      filter === 'ALL' ||
      (filter === 'TABLES' ? (r.isTable || Boolean(r.tableName) || r.status === 'TABLE_PENDING') : r.status === filter)
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
            <strong style={{ color: '#2ecc71' }}>{activeReservations.length} active(s)</strong> ({activeTicketsCount} billet(s) comptabilisé(s))
            {cancelledCount > 0 && (
              <span style={{ color: '#e74c3c', marginLeft: '0.6rem' }}>
                • {cancelledCount} annulée(s) (non comptabilisée(s))
              </span>
            )}
            {' '}• Équipe Staff : 🇧🇪 Belgique, 🇩🇪 Allemagne, 🇫🇷 France
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link
            href="/staff/liste-invites"
            className="btn btn-outline btn-sm"
            title="Consulter et imprimer la liste d'émargement et plan de tables A4"
          >
            🖨️ Liste Émargement & Tables
          </Link>
          <button
            onClick={() => setBroadcastOpen(true)}
            className="btn btn-gold btn-sm"
            title="Envoyer un email à l'ensemble des réservataires confirmés"
          >
            📢 Email Groupé ({activeReservations.length})
          </button>
          <button onClick={loadData} className="btn btn-outline btn-sm">
            🔄 Actualiser
          </button>
        </div>
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
          {(['ALL', 'TABLES', 'PENDING', 'CONFIRMED', 'CANCELLED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`btn btn-sm ${filter === tab ? 'btn-gold' : 'btn-outline'}`}
            >
              {tab === 'ALL' && 'Toutes'}
              {tab === 'TABLES' && '🍾 Tables VIP'}
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
                  const isCancelled = r.status === 'CANCELLED'
                  const sentCount = r.tickets.filter(t => t.sentAt).length
                  const chatUrl = getClientWhatsAppChatUrl(r)
                  const firstTicket = r.tickets[0]
                  const country = detectCountryFromPhone(r.phone)

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        ...(isCancelled ? {
                          opacity: 0.45,
                          background: 'rgba(255, 59, 48, 0.04)',
                          filter: 'grayscale(0.7)',
                        } : {})
                      }}
                    >
                      {/* Client */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{country.flag}</span>
                          <span style={{
                            fontWeight: 600,
                            color: isCancelled ? 'var(--text-muted)' : 'var(--text)',
                            textDecoration: isCancelled ? 'line-through' : 'none'
                          }}>
                            {r.firstName} {r.lastName}
                          </span>
                        </div>
                        <div style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                          marginTop: '0.15rem',
                          textDecoration: isCancelled ? 'line-through' : 'none'
                        }}>
                          📧 {r.email}
                        </div>
                        {r.phone && (
                          <div style={{
                            color: isCancelled ? 'var(--text-dim)' : 'var(--gold)',
                            fontSize: '0.82rem',
                            marginTop: '0.15rem',
                            fontWeight: 500,
                            textDecoration: isCancelled ? 'line-through' : 'none'
                          }}>
                            📱 {r.phone}
                          </div>
                        )}
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          {new Date(r.createdAt).toLocaleDateString('fr-FR')} {new Date(r.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Soirée & Billets */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          color: isCancelled ? 'var(--text-dim)' : 'var(--gold)',
                          fontWeight: 500,
                          textDecoration: isCancelled ? 'line-through' : 'none'
                        }}>
                          {r.event.title}
                        </div>
                        <div style={{
                          color: isCancelled ? 'var(--text-dim)' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          textDecoration: isCancelled ? 'line-through' : 'none'
                        }}>
                          {r.ticketCount}x {r.phase?.name ?? 'Standard'}
                        </div>
                        {(r.isTable || r.tableName || r.status === 'TABLE_PENDING') && (
                          <div style={{
                            margin: '0.25rem 0',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(212, 175, 55, 0.15)',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                            color: 'var(--gold)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-block'
                          }}>
                            🍾 {r.tableName || 'Table VIP'}
                          </div>
                        )}
                        {isCancelled ? (
                          <div style={{ color: '#e74c3c', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem' }}>
                            🛑 Non comptabilisé (Annulé)
                          </div>
                        ) : (r.maskCount > 0 || r.wantsMask) ? (
                          <div style={{ color: 'var(--gold)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                            🎭 {r.maskCount > 0 ? `${r.maskCount} masque(s)` : 'Masque inclus'}
                          </div>
                        ) : null}
                      </td>

                      {/* Total */}
                      <td style={{
                        padding: '1rem',
                        fontWeight: 600,
                        color: isCancelled ? 'var(--text-dim)' : 'var(--gold)',
                        textDecoration: isCancelled ? 'line-through' : 'none'
                      }}>
                        {r.totalAmount != null ? `${r.totalAmount}€` : '—'}
                      </td>

                      {/* Statut */}
                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${
                          r.status === 'CONFIRMED' ? 'badge-success' :
                          isCancelled ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {r.status === 'CONFIRMED' ? 'Confirmé' :
                           isCancelled ? '❌ Annulé' : 'En attente'}
                        </span>
                      </td>

                      {/* Billets QR */}
                      <td style={{ padding: '1rem' }}>
                        {isCancelled ? (
                          <div style={{ color: '#e74c3c', fontSize: '0.8rem', fontWeight: 600 }}>
                            🛑 QR Désactivé
                            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                              Entrée refusée au scan
                            </span>
                          </div>
                        ) : firstTicket ? (
                          <div>
                            <span style={{ color: '#2ecc71', fontSize: '0.82rem', fontWeight: 600, display: 'block' }}>
                              ✓ QR Généré ({r.tickets.length})
                            </span>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                              Ref: {firstTicket.qrCode.slice(0, 8).toUpperCase()}
                            </span>
                            {firstTicket.sentAt && (
                              <span style={{ display: 'block', color: 'var(--gold)', fontSize: '0.72rem' }}>
                                ✉️ Envoyé le {new Date(firstTicket.sentAt).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                            Non généré
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {isCancelled ? (
                          /* AUCUNE OPTION NORMALE LORSQUE ANNULÉ — SEULE RESTAURATION PAR CODE PIN */
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleRestoreReservation(r.id)}
                              className="btn btn-outline btn-sm"
                              style={{
                                color: 'var(--gold)',
                                borderColor: 'var(--gold-border)',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.78rem'
                              }}
                              title="Restaurer cette réservation avec le code PIN secret"
                            >
                              🔓 Restaurer (Code PIN)
                            </button>
                          </div>
                        ) : (
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

                            {/* Configurer la Table VIP si applicable */}
                            {(r.isTable || r.tableName || r.status === 'TABLE_PENDING') && (
                              <button
                                onClick={() => openTableModal(r)}
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--gold)', borderColor: 'var(--gold)', padding: '0.35rem 0.6rem' }}
                                title="Régler le nom de table, le montant convenu et les places"
                              >
                                🍾 Table VIP
                              </button>
                            )}

                            {/* Générer / envoyer email */}
                            <button
                              onClick={() => sendTicket(r.id, firstTicket?.sentAt)}
                              disabled={sendingId === r.id}
                              className="btn btn-gold btn-sm"
                              style={{ padding: '0.35rem 0.7rem' }}
                              title={firstTicket?.sentAt ? 'Déjà envoyé — Cliquez pour renvoyer une copie' : 'Générer le billet QR et envoyer par email'}
                            >
                              {sendingId === r.id
                                ? '...'
                                : firstTicket?.sentAt
                                ? '✉️ Déjà envoyé'
                                : firstTicket
                                ? '✉️ Envoyer billet'
                                : '🎟️ Créer billet'}
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

                            <button
                              onClick={() => updateStatus(r.id, 'CANCELLED')}
                              className="btn btn-outline btn-sm"
                              style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', padding: '0.35rem 0.5rem' }}
                              title="Annuler la réservation (Désactive le QR code et libère les places)"
                            >
                              ✕
                            </button>
                          </div>
                        )}
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

      {/* MODAL EMAIL GROUPÉ (BROADCAST) */}
      {broadcastOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#121212',
            border: '2px solid var(--gold)',
            borderRadius: '16px',
            maxWidth: '620px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--gold)', margin: 0 }}>
                📢 Envoyer un Email Groupé
              </h3>
              <button
                onClick={() => setBroadcastOpen(false)}
                className="btn btn-outline btn-sm"
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Cet email officiel sera envoyé à tous les invités dont la réservation est confirmée.
            </p>

            <form onSubmit={handleSendBroadcast}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Objet de l&apos;email *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Rappel important & Informations d'accès — Bal Masqué"
                  value={broadcastSubject}
                  onChange={e => setBroadcastSubject(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Corps du message officiel *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder={`Chers invités,\n\nNous avons hâte de vous retrouver ce soir pour notre Bal Masqué.\n\nRappel du dress code : Tenue de soirée chic & Masque obligatoire...\n\nÀ très vite !`}
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setBroadcastOpen(false)}
                  className="btn btn-outline"
                  disabled={broadcastSending}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={broadcastSending || !broadcastSubject.trim() || !broadcastMessage.trim()}
                >
                  {broadcastSending ? 'Envoi en cours...' : '🚀 Envoyer à tous les invités'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL CONFIGURATION TABLE VIP */}
      {tableModal.open && tableModal.reservation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#121212',
            border: '2px solid var(--gold)',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--gold)', margin: 0 }}>
                🍾 Configuration Table VIP
              </h3>
              <button
                onClick={() => setTableModal(prev => ({ ...prev, open: false }))}
                className="btn btn-outline btn-sm"
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Client : <strong style={{ color: '#fff' }}>{tableModal.reservation.firstName} {tableModal.reservation.lastName}</strong>
              {tableModal.reservation.phone && ` • 📱 ${tableModal.reservation.phone}`}
            </p>

            <form onSubmit={handleSaveTableModal}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Nom ou Emplacement de la Table *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Table Carré Or #1, Salon VIP Prestige..."
                  value={tableModal.tableName}
                  onChange={e => setTableModal(prev => ({ ...prev, tableName: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Montant convenu (€) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="Ex : 500"
                    value={tableModal.totalAmount}
                    onChange={e => setTableModal(prev => ({ ...prev, totalAmount: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Nombre de places (invités) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={tableModal.ticketCount}
                    onChange={e => setTableModal(prev => ({ ...prev, ticketCount: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Nombre de masques à fournir sur place
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={tableModal.maskCount}
                  onChange={e => setTableModal(prev => ({ ...prev, maskCount: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem', display: 'block' }}>
                  Les masques seront indiqués sur chaque billet scanné pour les invités de la table.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTableModal(prev => ({ ...prev, open: false }))}
                  className="btn btn-outline"
                  disabled={tableModal.isSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={tableModal.isSaving}
                >
                  {tableModal.isSaving ? 'Enregistrement...' : '🍾 Valider & Enregistrer la Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
