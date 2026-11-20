'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ReviewItem {
  id: string
  authorName: string
  rating: number
  comment: string
  createdAt: string
}

export default function AvisPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authorName, setAuthorName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await fetch('/api/reviews')
        const data = await res.json()
        if (Array.isArray(data)) setReviews(data)
      } finally {
        setLoading(false)
      }
    }
    loadReviews()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!authorName.trim() || !comment.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: authorName.trim(),
          rating,
          comment: comment.trim(),
        }),
      })
      if (res.ok) {
        setSuccess(true)
        setAuthorName('')
        setComment('')
        setRating(5)
        // Recharger les avis
        const refreshRes = await fetch('/api/reviews')
        const refreshData = await refreshRes.json()
        if (Array.isArray(refreshData)) setReviews(refreshData)
      } else {
        alert("Erreur lors de l'enregistrement de votre avis.")
      }
    } catch {
      alert("Erreur réseau.")
    } finally {
      setSubmitting(false)
    }
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0'

  return (
    <div style={{ minHeight: '100vh', background: '#090909', color: '#f5f0e8', fontFamily: 'var(--font-sans)' }}>
      {/* HEADER */}
      <nav style={{ borderBottom: '1px solid var(--border)', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <img src="/logo.png" alt="THE DISNASTY CIRCLE" style={{ height: '36px', width: 'auto', borderRadius: '4px' }} />
            <span style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.12em', fontSize: '0.9rem' }}>
              THE DISNASTY CIRCLE
            </span>
          </Link>
          <Link href="/" className="btn btn-outline btn-sm">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: '800px', padding: '3rem 1rem' }}>
        {/* TITRE & NOTE GLOBALE */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ color: 'var(--gold)', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
            Témoignages & Avis d&apos;Exception
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', margin: '0.5rem 0', color: '#fff' }}>
            L&apos;Expérience des Membres
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(212,175,55,0.1)', padding: '0.5rem 1.25rem', borderRadius: '30px', border: '1px solid var(--gold)', marginTop: '0.5rem' }}>
            <span style={{ color: '#D4AF37', fontSize: '1.2rem' }}>★</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{averageRating} / 5</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({reviews.length} avis)</span>
          </div>
        </div>

        {/* FORMULAIRE DE DÉPÔT D'AVIS */}
        <div className="card" style={{ padding: '2rem', marginBottom: '3rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)', margin: '0 0 0.5rem', fontSize: '1.4rem' }}>
            Partagez votre ressenti sur la soirée
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Votre avis permet à nos équipes d&apos;élever chaque nouvel événement au plus haut niveau de raffinement.
          </p>

          {success && (
            <div style={{ padding: '1rem', background: 'rgba(46, 204, 113, 0.15)', border: '1px solid #2ecc71', color: '#2ecc71', borderRadius: '8px', marginBottom: '1.5rem' }}>
              ✓ Merci infiniment pour votre avis ! Il a bien été publié parmi les retours d&apos;invités.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ÉTOILES */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                Votre Note Globale *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.8rem',
                      cursor: 'pointer',
                      color: star <= rating ? '#D4AF37' : '#444',
                      transition: 'transform 0.15s',
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* NOM */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                Votre Prénom & Nom *
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Alexandre M."
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* COMMENTAIRE */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'var(--gold)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                Votre Témoignage *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Partagez votre expérience sur la musique, l'ambiance, le service, le dress code..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="form-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-gold btn-lg"
              disabled={submitting || !authorName.trim() || !comment.trim()}
              style={{ width: '100%' }}
            >
              {submitting ? 'Publication...' : '✨ Publier mon avis'}
            </button>
          </form>
        </div>

        {/* LISTE DES AVIS PUBLIÉS */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: '#fff', marginBottom: '1.25rem' }}>
            Les Derniers Retours
          </h2>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Chargement des avis...</p>
          ) : reviews.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Soyez le premier à partager votre expérience !</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.map(rev => (
                <div key={rev.id} className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {rev.authorName}
                    </div>
                    <div style={{ color: '#D4AF37', fontSize: '1.1rem' }}>
                      {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                    « {rev.comment} »
                  </p>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.6rem' }}>
                    {new Date(rev.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
