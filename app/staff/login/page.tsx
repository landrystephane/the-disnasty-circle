'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function StaffLogin() {
  const router = useRouter()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      // Store session in localStorage (simple auth for now)
      localStorage.setItem('staff_session', JSON.stringify(data))
      router.push('/staff/dashboard')
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="THE DYNASTY CIRCLE" style={{ height: '76px', width: 'auto', marginBottom: '0.75rem', borderRadius: '6px' }} />
          <p className={styles.logoSub}>STAFF ACCESS</p>
        </div>

        <h1 className={`font-serif ${styles.title}`}>Connexion</h1>
        <p className={styles.subtitle}>Accès réservé au personnel THE DYNASTY CIRCLE</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@dynastycircle.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className="btn btn-gold" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Connexion...</> : 'Se connecter →'}
          </button>
        </form>

        <p className={styles.back}>
          <a href="/" style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>← Retour au site</a>
        </p>
      </div>
    </div>
  )
}
