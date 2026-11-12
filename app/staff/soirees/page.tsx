'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface EventItem {
  id: string
  slug: string
  title: string
  subtitle: string | null
  date: string
  location: string
  timeStart: string
  status: string
  whatsappNumber: string
  ticketPhases: { id: string; name: string; price: number; soldCount: number; maxQuantity: number | null; isActive: boolean }[]
  _count: { reservations: number }
}

export default function StaffSoirees() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      if (Array.isArray(data)) setEvents(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  async function toggleStatus(event: EventItem) {
    const newStatus = event.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE'
    setUpdatingId(event.id)
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, status: newStatus }),
      })
      if (res.ok) {
        setEvents(prev =>
          prev.map(e => (e.id === event.id ? { ...e, status: newStatus } : e))
        )
        setMessage(
          newStatus === 'CLOSED'
            ? `🔒 Réservations fermées pour « ${event.title} » (Complet).`
            : `🔓 Réservations rouvertes pour « ${event.title} » !`
        )
        setTimeout(() => setMessage(null), 4000)
      }
    } finally {
      setUpdatingId(null)
    }
  }

  async function updateWhatsApp(event: EventItem, newNumber: string) {
    setUpdatingId(event.id)
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, whatsappNumber: newNumber }),
      })
      if (res.ok) {
        setEvents(prev =>
          prev.map(e => (e.id === event.id ? { ...e, whatsappNumber: newNumber } : e))
        )
        setMessage('Numéro WhatsApp mis à jour avec succès.')
        setTimeout(() => setMessage(null), 3000)
      }
    } finally {
      setUpdatingId(null)
    }
  }

  async function deleteEvent(id: string, title: string) {
    if (!confirm(`Confirmez-vous la suppression de la soirée « ${title} » ?\n\nCette action est irréversible.`)) return
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id))
        setMessage(`Soirée « ${title} » supprimée.`)
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--text)' }}>
            Gestion des Soirées
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Contrôlez l&apos;ouverture des réservations et les paramètres d&apos;accueil.
          </p>
        </div>
        <Link href="/staff/soirees/nouvelle" className="btn btn-gold">
          + Publier une nouvelle soirée
        </Link>
      </div>

      {message && (
        <div style={{
          padding: '0.8rem 1.2rem',
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid var(--gold-border)',
          color: 'var(--gold)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          ✨ {message}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 1rem' }} />
          <p>Chargement des événements...</p>
        </div>
      ) : events.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Aucune soirée trouvée.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {events.map(event => {
            const isClosed = event.status === 'CLOSED'

            return (
              <div key={event.id} className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', color: 'var(--text)', margin: 0 }}>
                        {event.title}
                      </h2>
                      <span className={`badge ${isClosed ? 'badge-danger' : 'badge-success'}`}>
                        {isClosed ? '🔒 Réservations Clôturées (COMPLET)' : '🟢 Réservations Ouvertes'}
                      </span>
                    </div>
                    {event.subtitle && (
                      <p style={{ color: 'var(--gold)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
                        {event.subtitle}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link
                      href={`/staff/soirees/${event.id}`}
                      className="btn btn-gold btn-sm"
                    >
                      ✏️ Modifier
                    </Link>

                    <Link
                      href={`/soirees/${event.slug}`}
                      target="_blank"
                      className="btn btn-outline btn-sm"
                    >
                      👁️ Voir la page
                    </Link>

                    <button
                      onClick={() => toggleStatus(event)}
                      disabled={updatingId === event.id}
                      className={`btn btn-sm ${isClosed ? 'btn-gold' : 'btn-outline'}`}
                      style={!isClosed ? { borderColor: 'rgba(231,76,60,0.5)', color: '#e74c3c' } : {}}
                    >
                      {updatingId === event.id
                        ? '...'
                        : isClosed
                        ? '🔓 Rouvrir'
                        : '🔒 Clôturer'}
                    </button>

                    <button
                      onClick={() => deleteEvent(event.id, event.title)}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.4)', padding: '0.3rem 0.6rem' }}
                      title="Supprimer la soirée"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* DETAILS GRID */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  marginBottom: '1.25rem'
                }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date & Heure</p>
                    <p style={{ color: 'var(--text)', fontWeight: 500, marginTop: '0.2rem' }}>
                      📅 {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} dès {event.timeStart}
                    </p>
                  </div>

                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Lieu</p>
                    <p style={{ color: 'var(--text)', fontWeight: 500, marginTop: '0.2rem' }}>
                      📍 {event.location}
                    </p>
                  </div>

                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Réservations enregistrées</p>
                    <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem' }}>
                      {event._count.reservations}
                    </p>
                  </div>

                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>WhatsApp de contact</p>
                    <p style={{ color: 'var(--text)', fontWeight: 500, marginTop: '0.2rem' }}>
                      💬 {event.whatsappNumber}
                    </p>
                  </div>
                </div>

                {/* PHASES & TARIFS */}
                <div>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    Phases de billetterie
                  </h4>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {event.ticketPhases.map(p => (
                      <div
                        key={p.id}
                        style={{
                          padding: '0.5rem 0.9rem',
                          background: 'rgba(212, 175, 55, 0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{p.price}€</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{p.name}</span>
                        {p.soldCount > 0 && (
                          <span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>({p.soldCount} réservés)</span>
                        )}
                      </div>
                    ))}
                    <div
                      style={{
                        padding: '0.5rem 0.9rem',
                        background: 'rgba(212, 175, 55, 0.05)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--gold)' }}>+10€</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>🎭 Masque optionnel</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
