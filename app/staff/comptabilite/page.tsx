'use client'

import { useEffect, useState, useCallback } from 'react'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  event?: { title: string } | null
}

interface Donation {
  id: string
  donorName: string
  amount: number
  type: string
  notes: string | null
  date: string
}

interface Summary {
  ticketRevenue: number
  totalDonations: number
  totalExpenses: number
  totalGrossRevenue: number
  netProfit: number
  confirmedOrdersCount: number
}

export default function StaffComptabilite() {
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [summary, setSummary] = useState<Summary>({
    ticketRevenue: 0,
    totalDonations: 0,
    totalExpenses: 0,
    totalGrossRevenue: 0,
    netProfit: 0,
    confirmedOrdersCount: 0,
  })

  const [activeTab, setActiveTab] = useState<'DEPENSES' | 'DONS' | 'BILLETTERIE'>('DEPENSES')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    category: 'Lieu / Salle',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  })

  // Donation form state
  const [donationForm, setDonationForm] = useState({
    donorName: '',
    amount: '',
    type: 'DON',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finances')
      const data = await res.json()
      if (data.expenses)  setExpenses(data.expenses)
      if (data.donations) setDonations(data.donations)
      if (data.summary)   setSummary(data.summary)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_EXPENSE', ...expenseForm }),
      })
      if (res.ok) {
        setShowExpenseModal(false)
        setExpenseForm({ category: 'Lieu / Salle', description: '', amount: '', date: new Date().toISOString().split('T')[0] })
        setMessage('Dépense enregistrée avec succès.')
        await loadData()
        setTimeout(() => setMessage(null), 3000)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddDonation(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_DONATION', ...donationForm }),
      })
      if (res.ok) {
        setShowDonationModal(false)
        setDonationForm({ donorName: '', amount: '', type: 'DON', notes: '', date: new Date().toISOString().split('T')[0] })
        setMessage('Montant perçu enregistré avec succès.')
        await loadData()
        setTimeout(() => setMessage(null), 3000)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(type: 'expense' | 'donation', id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return
    try {
      const res = await fetch(`/api/finances?type=${type}&id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage('Élément supprimé.')
        await loadData()
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{ maxWidth: '1300px', width: '100%', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--text)', margin: 0 }}>
            Comptabilité & Trésorerie
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Suivi des recettes billetterie, des montants perçus des donateurs et des dépenses.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowExpenseModal(true)} className="btn btn-outline" style={{ borderColor: 'rgba(231,76,60,0.5)', color: '#e74c3c' }}>
            ➖ Ajouter une dépense
          </button>
          <button onClick={() => setShowDonationModal(true)} className="btn btn-outline" style={{ borderColor: 'rgba(46,204,113,0.5)', color: '#2ecc71' }}>
            ➕ Encaisser un don / sponsor
          </button>
          <button onClick={loadData} className="btn btn-outline btn-sm">
            🔄 Actualiser
          </button>
        </div>
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

      {/* KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="card" style={{ borderLeft: '3px solid #3498db', padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            🎟️ Recettes Billetterie
          </p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: '#3498db', margin: '0.4rem 0' }}>
            {summary.ticketRevenue.toFixed(0)}€
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            {summary.confirmedOrdersCount} commande(s) confirmée(s)
          </p>
        </div>

        <div className="card" style={{ borderLeft: '3px solid #2ecc71', padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            🎁 Dons & Sponsoring
          </p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: '#2ecc71', margin: '0.4rem 0' }}>
            {summary.totalDonations.toFixed(0)}€
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            {donations.length} donateur(s) / sponsor(s)
          </p>
        </div>

        <div className="card" style={{ borderLeft: '3px solid #e74c3c', padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            📉 Dépenses Totales
          </p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: '#e74c3c', margin: '0.4rem 0' }}>
            {summary.totalExpenses.toFixed(0)}€
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            {expenses.length} poste(s) de frais
          </p>
        </div>

        <div className="card" style={{ borderLeft: `3px solid ${summary.netProfit >= 0 ? 'var(--gold)' : '#e74c3c'}`, padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            💎 Bénéfice Net
          </p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: summary.netProfit >= 0 ? 'var(--gold)' : '#e74c3c', margin: '0.4rem 0' }}>
            {summary.netProfit >= 0 ? `+${summary.netProfit.toFixed(0)}€` : `${summary.netProfit.toFixed(0)}€`}
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            (Billetterie + Dons) - Dépenses
          </p>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('DEPENSES')}
          className={`btn btn-sm ${activeTab === 'DEPENSES' ? 'btn-gold' : 'btn-outline'}`}
        >
          📉 Dépenses & Frais ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('DONS')}
          className={`btn btn-sm ${activeTab === 'DONS' ? 'btn-gold' : 'btn-outline'}`}
        >
          🎁 Dons & Donateurs ({donations.length})
        </button>
      </div>

      {/* TAB 1: DÉPENSES */}
      {activeTab === 'DEPENSES' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="font-serif" style={{ fontSize: '1.2rem', color: 'var(--text)', margin: 0 }}>
              Registre des Dépenses
            </h3>
            <button onClick={() => setShowExpenseModal(true)} className="btn btn-sm btn-gold">
              + Nouvelle dépense
            </button>
          </div>

          {expenses.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Aucune dépense enregistrée pour le moment.</p>
              <button onClick={() => setShowExpenseModal(true)} className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem' }}>
                Enregistrer la première dépense
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Catégorie</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Description / Motif</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Montant</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                        {new Date(e.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-warning">{e.category}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text)' }}>
                        {e.description}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600, color: '#e74c3c' }}>
                        -{e.amount.toFixed(2)}€
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDelete('expense', e.id)}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', padding: '0.2rem 0.5rem' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DONS & DONATEURS */}
      {activeTab === 'DONS' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="font-serif" style={{ fontSize: '1.2rem', color: 'var(--text)', margin: 0 }}>
              Montants Perçus des Donateurs & Sponsors
            </h3>
            <button onClick={() => setShowDonationModal(true)} className="btn btn-sm btn-gold">
              + Encaisser un don / sponsor
            </button>
          </div>

          {donations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Aucun donateur ou sponsor enregistré pour le moment.</p>
              <button onClick={() => setShowDonationModal(true)} className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem' }}>
                Enregistrer un premier montant perçu
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Donateur / Entreprise</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Type</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Notes / Remarques</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Montant Perçu</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                        {new Date(d.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text)' }}>
                        {d.donorName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-success">{d.type}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {d.notes || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#2ecc71', fontSize: '1rem' }}>
                        +{d.amount.toFixed(2)}€
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDelete('donation', d.id)}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', padding: '0.2rem 0.5rem' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: AJOUTER UNE DÉPENSE */}
      {showExpenseModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h2 className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              Enregistrer une Dépense
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Renseignez les frais liés à l&apos;organisation d&apos;une soirée ou du groupe.
            </p>

            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Catégorie *</label>
                <select
                  className="form-input form-select"
                  style={{ backgroundColor: '#141414', color: '#F5F0E8', border: '1px solid var(--border)' }}
                  value={expenseForm.category}
                  onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                  required
                >
                  <option value="Lieu / Salle">Lieu / Salle</option>
                  <option value="Boissons & Traiteur">Boissons & Traiteur</option>
                  <option value="Son, Lumière & DJ">Son, Lumière & DJ</option>
                  <option value="Sécurité & Staff">Sécurité & Staff</option>
                  <option value="Décoration & Masques">Décoration & Masques</option>
                  <option value="Communication & Print">Communication & Print</option>
                  <option value="Assurance & Administratif">Assurance & Administratif</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Fournisseur *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Acompte location salle, Achat masques vénitiens..."
                  value={expenseForm.description}
                  onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Montant (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="350.00"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expenseForm.date}
                    onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-gold" disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Enregistrement...' : 'Valider la dépense'}
                </button>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-outline">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER UN DON / SPONSOR */}
      {showDonationModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h2 className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              Encaisser un Don ou Sponsoring
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Ajoutez les montants perçus des donateurs, mécènes ou sponsors de la soirée.
            </p>

            <form onSubmit={handleAddDonation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nom du donateur ou entreprise *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: M. Jean Dupont, Société X..."
                  value={donationForm.donorName}
                  onChange={e => setDonationForm(f => ({ ...f, donorName: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Montant perçu (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="500.00"
                    value={donationForm.amount}
                    onChange={e => setDonationForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Type de versement</label>
                  <select
                    className="form-input"
                    value={donationForm.type}
                    onChange={e => setDonationForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="DON">Don gracieux</option>
                    <option value="SPONSOR">Sponsoring / Partenaire</option>
                    <option value="MÉCÉNAT">Mécénat</option>
                    <option value="AUTRE">Autre apport</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Modalités (optionnel)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Par virement bancaire, chèque, contrepartie table VIP..."
                  value={donationForm.notes}
                  onChange={e => setDonationForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={donationForm.date}
                  onChange={e => setDonationForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-gold" disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Enregistrement...' : 'Valider le montant perçu'}
                </button>
                <button type="button" onClick={() => setShowDonationModal(false)} className="btn btn-outline">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
