'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

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
  isTable?: boolean
  tableName?: string | null
  createdAt: string
  event: { title: string; date?: string; location?: string }
  phase: { name: string; price: number } | null
  tickets: { id: string; qrCode: string; ticketNumber: number; isUsed: boolean; hasMask?: boolean; isTableTicket?: boolean; tableName?: string | null }[]
}

export default function ListeInvitesPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'ALL' | 'TABLES' | 'INDIVIDUAL'>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/reservations')
        const data = await res.json()
        if (Array.isArray(data)) setReservations(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filtrer les réservations valides (exclure annulées pour l'émargement)
  const activeReservations = useMemo(() => {
    return reservations.filter(r => r.status !== 'CANCELLED')
  }, [reservations])

  // Génération de la liste détaillée de chaque invité individuel (1 ligne par billet)
  const guestRows = useMemo(() => {
    const rows: {
      reservationId: string
      guestName: string
      email: string
      phone: string
      isTable: boolean
      tableName: string
      ticketIndex: number
      totalInGroup: number
      hasMask: boolean
      totalAmount: number | null
      qrCode: string
      isUsed: boolean
    }[] = []

    for (const r of activeReservations) {
      const isTable = Boolean(r.isTable || r.tableName)
      const tableName = r.tableName || (isTable ? 'Table VIP' : 'Entrée Standard')
      const count = r.ticketCount || 1

      // Si des billets existent déjà
      if (r.tickets && r.tickets.length > 0) {
        r.tickets.forEach((t, idx) => {
          rows.push({
            reservationId: r.id,
            guestName: idx === 0 ? `${r.firstName} ${r.lastName}` : `${r.firstName} ${r.lastName} (Invité ${idx + 1})`,
            email: r.email,
            phone: r.phone || '—',
            isTable,
            tableName: t.tableName || tableName,
            ticketIndex: t.ticketNumber || (idx + 1),
            totalInGroup: count,
            hasMask: Boolean(t.hasMask ?? r.wantsMask),
            totalAmount: idx === 0 ? r.totalAmount : null,
            qrCode: t.qrCode.slice(0, 8).toUpperCase(),
            isUsed: t.isUsed,
          })
        })
      } else {
        // Réservation confirmée dont les billets n'ont pas encore été générés
        for (let i = 1; i <= count; i++) {
          rows.push({
            reservationId: r.id,
            guestName: i === 1 ? `${r.firstName} ${r.lastName}` : `${r.firstName} ${r.lastName} (Place ${i})`,
            email: r.email,
            phone: r.phone || '—',
            isTable,
            tableName,
            ticketIndex: i,
            totalInGroup: count,
            hasMask: r.wantsMask,
            totalAmount: i === 1 ? r.totalAmount : null,
            qrCode: 'À GÉNÉRER',
            isUsed: false,
          })
        }
      }
    }

    return rows
  }, [activeReservations])

  // Filtrage selon vue choisie
  const filteredRows = useMemo(() => {
    return guestRows.filter(row => {
      if (filterType === 'TABLES' && !row.isTable) return false
      if (filterType === 'INDIVIDUAL' && row.isTable) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          row.guestName.toLowerCase().includes(q) ||
          row.tableName.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.phone.includes(q) ||
          row.qrCode.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [guestRows, filterType, search])

  // Export CSV
  function exportCSV() {
    const headers = ['Pointage', 'Nom & Prenom', 'Type Acces / Table', 'Place N°', 'Masque', 'Telephone', 'Email', 'Reference Billet']
    const csvRows = [headers.join(';')]

    filteredRows.forEach(r => {
      const line = [
        r.isUsed ? 'PRESENT' : 'EN ATTENTE',
        `"${r.guestName}"`,
        `"${r.tableName}"`,
        `${r.ticketIndex}/${r.totalInGroup}`,
        r.hasMask ? 'OUI (Masque inclus)' : 'NON',
        `"${r.phone}"`,
        `"${r.email}"`,
        r.qrCode,
      ]
      csvRows.push(line.join(';'))
    })

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `liste-invites-disnasty-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const tableCount = activeReservations.filter(r => r.isTable || r.tableName).length
  const totalGuests = guestRows.length
  const totalMasks = guestRows.filter(r => r.hasMask).length

  return (
    <div style={{ maxWidth: '1300px', width: '100%', margin: '0 auto', padding: '1rem' }}>
      {/* BOUTONS D'ACTIONS (Masqués à l'impression) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/staff/reservations" style={{ color: 'var(--gold)', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Retour aux réservations
          </Link>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', margin: '0.3rem 0', color: 'var(--text)' }}>
            Feuille d&apos;Émargement & Plan de Tables
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            {totalGuests} invité(s) attendu(s) • {tableCount} Table(s) VIP • {totalMasks} Masque(s) à fournir
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} className="btn btn-gold btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🖨️</span>
            <span>Imprimer la liste (A4 / PDF)</span>
          </button>
          <button onClick={exportCSV} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📥</span>
            <span>Exporter en CSV</span>
          </button>
        </div>
      </div>

      {/* FILTRES & RECHERCHE (Masqués à l'impression) */}
      <div className="no-print" style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        padding: '0.85rem 1.2rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterType('ALL')}
            className={`btn btn-sm ${filterType === 'ALL' ? 'btn-gold' : 'btn-outline'}`}
          >
            📋 Tous ({guestRows.length})
          </button>
          <button
            onClick={() => setFilterType('TABLES')}
            className={`btn btn-sm ${filterType === 'TABLES' ? 'btn-gold' : 'btn-outline'}`}
          >
            🍾 Tables VIP ({guestRows.filter(r => r.isTable).length})
          </button>
          <button
            onClick={() => setFilterType('INDIVIDUAL')}
            className={`btn btn-sm ${filterType === 'INDIVIDUAL' ? 'btn-gold' : 'btn-outline'}`}
          >
            🎟️ Entrées simples ({guestRows.filter(r => !r.isTable).length})
          </button>
        </div>

        <input
          type="text"
          placeholder="🔍 Rechercher invité, table, réf..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
          style={{ maxWidth: '280px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        />
      </div>

      {/* EN-TÊTE OFFICIEL POUR L'IMPRESSION (Visible uniquement à l'impression ou à l'écran) */}
      <div style={{
        borderBottom: '2px solid #D4AF37',
        paddingBottom: '1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.1em', color: '#D4AF37' }}>
            THE DISNASTY CIRCLE
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
            Feuille de Contrôle d&apos;Entrée & Plan de Dispositions
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Édition du {new Date().toLocaleDateString('fr-FR')} • Événement officiel
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <div>Total Attendus : <strong style={{ color: '#D4AF37' }}>{totalGuests}</strong></div>
          <div>Tables VIP : <strong>{tableCount}</strong> | Masques : <strong>{totalMasks}</strong></div>
        </div>
      </div>

      {/* TABLEAU HAUTE LISIBILITÉ POUR ÉMARGEMENT */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Chargement de la liste...</p>
      ) : filteredRows.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucun invité ne correspond aux critères.</p>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', color: '#000', borderRadius: '8px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
            textAlign: 'left',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #333' }}>
                <th style={{ padding: '8px 10px', width: '38px', textAlign: 'center' }}>[ ✓ ]</th>
                <th style={{ padding: '8px 10px' }}>Nom & Prénom</th>
                <th style={{ padding: '8px 10px' }}>Emplacement / Table</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Place</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Masque</th>
                <th style={{ padding: '8px 10px' }}>Contact</th>
                <th style={{ padding: '8px 10px' }}>Réf Billet</th>
                <th style={{ padding: '8px 10px', width: '90px' }}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr
                  key={`${row.reservationId}-${idx}`}
                  style={{
                    borderBottom: '1px solid #ddd',
                    background: row.isTable ? '#fffdf5' : '#ffffff',
                  }}
                >
                  {/* Case à cocher pour pointage physique */}
                  <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '1.5px solid #444',
                      borderRadius: '3px',
                      margin: '0 auto',
                      background: row.isUsed ? '#444' : '#fff'
                    }}>
                      {row.isUsed && <span style={{ color: '#fff', fontSize: '11px', lineHeight: '18px' }}>✓</span>}
                    </div>
                  </td>

                  {/* Nom & Prénom */}
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                    {row.guestName}
                  </td>

                  {/* Table ou Entrée standard */}
                  <td style={{ padding: '8px 10px' }}>
                    {row.isTable ? (
                      <span style={{ fontWeight: 700, color: '#8a6d1b' }}>
                        🍾 {row.tableName}
                      </span>
                    ) : (
                      <span style={{ color: '#555' }}>
                        🎟️ Standard
                      </span>
                    )}
                  </td>

                  {/* Place N° */}
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>
                    {row.ticketIndex}/{row.totalInGroup}
                  </td>

                  {/* Masque */}
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    {row.hasMask ? (
                      <span style={{ fontWeight: 700, color: '#27ae60' }}>🎭 OUI</span>
                    ) : (
                      <span style={{ color: '#999' }}>—</span>
                    )}
                  </td>

                  {/* Téléphone */}
                  <td style={{ padding: '8px 10px', fontSize: '0.78rem' }}>
                    <div>{row.phone}</div>
                    <div style={{ color: '#777', fontSize: '0.72rem' }}>{row.email}</div>
                  </td>

                  {/* Réf QR code */}
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                    {row.qrCode}
                  </td>

                  {/* Signature */}
                  <td style={{ padding: '8px 10px', borderLeft: '1px dashed #ccc' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* STYLES SPÉCIFIQUES POUR IMPRESSION PAPIER / PDF */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          nav, header, footer, aside, .sidebar {
            display: none !important;
          }
          table {
            font-size: 10pt !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
