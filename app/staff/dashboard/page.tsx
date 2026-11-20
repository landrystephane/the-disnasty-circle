'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import styles from './dashboard.module.css'

interface Stats {
  total: number
  pending: number
  confirmed: number
  cancelled: number
  revenue: number
  ticketsSent: number
}

interface Reservation {
  id: string
  firstName: string
  lastName: string
  email: string
  ticketCount: number
  wantsMask: boolean
  status: string
  totalAmount: number | null
  createdAt: string
  event:  { title: string; slug: string; whatsappNumber: string }
  phase:  { name: string; price: number } | null
  tickets: { id: string; isUsed: boolean; sentAt: string | null }[]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (days  > 0) return `il y a ${days}j`
  if (hours > 0) return `il y a ${hours}h`
  if (mins  > 0) return `il y a ${mins}min`
  return 'à l\'instant'
}

export default function StaffDashboard() {
  const [reservations, setReservations]   = useState<Reservation[]>([])
  const [stats, setStats]                 = useState<Stats>({ total: 0, pending: 0, confirmed: 0, cancelled: 0, revenue: 0, ticketsSent: 0 })
  const [loading, setLoading]             = useState(true)
  const [sendingId, setSendingId]         = useState<string | null>(null)
  const [sendSuccess, setSendSuccess]     = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/reservations')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setReservations(list)

      // Compute stats
      const s: Stats = { total: 0, pending: 0, confirmed: 0, cancelled: 0, revenue: 0, ticketsSent: 0 }
      for (const r of list) {
        if (r.status === 'CANCELLED') {
          s.cancelled++
          continue // Exclure strictement les réservations annulées des comptes de la soirée
        }
        s.total++
        if (r.status === 'PENDING')   s.pending++
        if (r.status === 'CONFIRMED') { s.confirmed++; s.revenue += r.totalAmount ?? 0 }
        if (Array.isArray(r.tickets)) {
          s.ticketsSent += r.tickets.filter((t: { sentAt: string | null }) => t.sentAt).length
        }
      }
      setStats(s)
    } catch (err) {
      console.error('Failed to load reservations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function sendTicket(reservationId: string) {
    setSendingId(reservationId)
    setSendSuccess(null)
    try {
      const res = await fetch('/api/tickets/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSendSuccess(reservationId)
        await loadData()
        setTimeout(() => setSendSuccess(null), 3000)
      } else {
        alert(data.error || 'Erreur lors de l\'envoi du billet.')
      }
    } catch (err: any) {
      alert('Erreur réseau : ' + (err?.message || 'Erreur inconnue'))
    } finally {
      setSendingId(null)
    }
  }

  function getWhatsAppUrl(reservation: Reservation) {
    const phone = reservation.event.whatsappNumber.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Bonjour ${reservation.firstName} ${reservation.lastName} 👋,\n\nNous avons bien reçu votre demande de réservation pour *${reservation.event.title}*.\n\nPour confirmer votre place, merci de procéder au virement de *${reservation.totalAmount ?? '...'}€*.\n\nUne fois le paiement reçu, nous vous enverrons votre billet par email dans les plus brefs délais. 🎭✨\n\nTHE DISNASTY CIRCLE`
    )
    return `https://wa.me/${phone}?text=${msg}`
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <p>Chargement...</p>
      </div>
    )
  }

  const recent = reservations.slice(0, 10)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={`font-serif ${styles.pageTitle}`}>Tableau de bord</h1>
          <p className={styles.pageSubtitle}>Bienvenue, gérez vos soirées en temps réel.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/staff/soirees" className="btn btn-gold btn-sm">Gérer les soirées</Link>
          <button onClick={loadData} className="btn btn-outline btn-sm">↻ Rafraîchir</button>
        </div>
      </div>

      {/* Raccourcis Staff Mobile & Desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.75rem'
      }}>
        <Link href="/staff/scanner" className="btn btn-gold" style={{ justifyContent: 'center', padding: '0.85rem 0.5rem', fontSize: '0.88rem', gap: '0.4rem', textDecoration: 'none' }}>
          <span>🔍</span>
          <span>Scanner QR</span>
        </Link>
        <Link href="/staff/reservations" className="btn btn-outline" style={{ justifyContent: 'center', padding: '0.85rem 0.5rem', fontSize: '0.88rem', gap: '0.4rem', textDecoration: 'none' }}>
          <span>🎫</span>
          <span>Réservations</span>
        </Link>
        <Link href="/staff/soirees" className="btn btn-outline" style={{ justifyContent: 'center', padding: '0.85rem 0.5rem', fontSize: '0.88rem', gap: '0.4rem', textDecoration: 'none' }}>
          <span>🎉</span>
          <span>Soirées</span>
        </Link>
        <Link href="/staff/comptabilite" className="btn btn-outline" style={{ justifyContent: 'center', padding: '0.85rem 0.5rem', fontSize: '0.88rem', gap: '0.4rem', textDecoration: 'none' }}>
          <span>💰</span>
          <span>Comptabilité</span>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total réservations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
            <div className="stat-label">En attente</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.confirmed}</div>
            <div className="stat-label">Confirmées</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.revenue.toFixed(0)}€</div>
            <div className="stat-label">Revenus confirmés</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.ticketsSent}</div>
            <div className="stat-label">Billets envoyés</div>
          </div>
        </div>
      )}

      {/* Recent reservations */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={`font-serif ${styles.sectionTitle}`}>
            Dernières réservations
            {stats?.pending ? <span className="notification-dot" style={{ marginLeft: '0.6rem' }} /> : null}
          </h2>
          <Link href="/staff/reservations" className="btn btn-outline btn-sm">Voir tout →</Link>
        </div>

        {recent.length === 0 ? (
          <div className={styles.empty}>
            <span>🎭</span>
            <p>Aucune réservation pour le moment.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invité</th>
                  <th>Soirée</th>
                  <th>Billets</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className={styles.guestName}>{r.firstName} {r.lastName}</div>
                      <div className={styles.guestEmail}>{r.email}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.event.title}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.ticketCount}</span>
                      {r.wantsMask && <span title="Masque" style={{ marginLeft: '0.3rem' }}>🎭</span>}
                    </td>
                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                      {r.totalAmount ? `${r.totalAmount}€` : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${r.status.toLowerCase()}`}>
                        {r.status === 'PENDING'   ? 'En attente' :
                         r.status === 'CONFIRMED' ? 'Confirmé'   : 'Annulé'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      {timeAgo(r.createdAt)}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {/* WhatsApp */}
                        <a
                          href={getWhatsAppUrl(r)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          title="Contacter sur WhatsApp"
                          style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)', padding: '0.3rem 0.6rem' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>

                        {/* Send ticket */}
                        {r.status !== 'CANCELLED' && (
                          <button
                            onClick={() => sendTicket(r.id)}
                            disabled={sendingId === r.id}
                            className="btn btn-sm"
                            title={r.tickets.some(t => t.sentAt) ? 'Renvoyer le billet' : 'Envoyer le billet'}
                            style={{
                              background: sendSuccess === r.id ? 'var(--success-bg)' : 'var(--gold-subtle)',
                              color:      sendSuccess === r.id ? 'var(--success)' : 'var(--gold)',
                              border:     `1px solid ${sendSuccess === r.id ? 'rgba(46,204,113,0.3)' : 'rgba(212,175,55,0.3)'}`,
                            }}
                          >
                            {sendingId === r.id    ? <span className="spinner" style={{ width: 12, height: 12 }} /> :
                             sendSuccess === r.id  ? '✅' :
                             r.tickets.some(t => t.sentAt) ? '↩ Billet' : '🎫 Envoyer'}
                          </button>
                        )}

                        {/* Detail link */}
                        <Link href="/staff/reservations" className="btn btn-sm btn-outline">
                          Gérer
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
