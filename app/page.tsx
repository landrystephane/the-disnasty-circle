import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import styles from './home.module.css'

async function getEvents() {
  try {
    return await prisma.event.findMany({
      where: { status: { not: 'ARCHIVED' } },
      include: {
        ticketPhases: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { reservations: true } },
      },
      orderBy: { date: 'asc' },
    })
  } catch {
    return []
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date))
}

function getActivePrice(phases: { price: number; name: string; isActive: boolean; endDate: Date | null }[]) {
  const now = new Date()
  const active = phases.find(p => p.isActive && (!p.endDate || new Date(p.endDate) > now))
  return active ? active.price : (phases[0]?.price ?? null)
}

export default async function HomePage() {
  const events = await getEvents()

  return (
    <div className={styles.page}>
      {/* ── BACKGROUND PARTICLES ── */}
      <div className={styles.particles}>
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${(i * 3.7) % 100}%`,
            top: `${(i * 5.3) % 100}%`,
            animationDelay: `${(i * 0.4) % 6}s`,
            animationDuration: `${5 + ((i * 0.7) % 4)}s`,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
          }} />
        ))}
      </div>

      {/* ── NAVBAR ── */}
      <nav className={styles.navbar}>
        <div className={`container ${styles.navInner}`}>
          <Link href="/" className={styles.navLogo}>
            <img
              src="/logo.png"
              alt="THE DISNASTY CIRCLE"
              className={styles.navLogoImg}
              style={{ height: '42px', width: 'auto', borderRadius: '4px' }}
            />
            <span className={styles.navLogoFull}>THE DISNASTY CIRCLE</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="#soirees" className={styles.navLink}>Événements</Link>
            <Link href="#cercle" className={styles.navLink}>Le Cercle</Link>
            <Link href="/staff/login" className="btn btn-outline btn-sm">Espace Staff</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={`container ${styles.heroContent}`}>
          <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/logo.png"
              alt="THE DISNASTY CIRCLE Logo Officiel"
              style={{
                width: '135px',
                height: 'auto',
                filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.5))',
                borderRadius: '8px'
              }}
            />
          </div>

          <p className={styles.heroEyebrow}>✦ Cercle Privé & Événements d&apos;Exception ✦</p>

          <h1 className={`${styles.heroTitle} font-serif`}>
            THE DISNASTY<br />
            <span className="text-shimmer">CIRCLE</span>
          </h1>

          <p className={styles.heroSubtitle}>
            PRESTIGE &nbsp;•&nbsp; NIGHTLIFE &nbsp;•&nbsp; EXPÉRIENCES EXCLUSIVES
          </p>

          <div className={styles.heroDivider}>
            <span />
            <span style={{ color: 'var(--gold)', fontSize: '1.2rem' }}>👑</span>
            <span />
          </div>

          <p className={styles.heroDesc}>
            L&apos;art de concevoir des soirées mémorables à Paris.<br />
            Chaque événement offre une atmosphère immersive, un univers dédié et une sélection raffinée.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/soirees/bal-masque" className="btn btn-gold btn-lg">
              🎭 Découvrir le Bal Masqué (19 Déc.) →
            </Link>
            <Link href="#soirees" className="btn btn-outline btn-lg">
              Toutes les soirées ↓
            </Link>
            <Link href="/staff/login" className="btn btn-outline btn-lg">
              🔑 Espace Staff
            </Link>
          </div>
        </div>
      </section>

      {/* ── PILLARS ── */}
      <section id="cercle" className="section" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            textAlign: 'center'
          }}>
            <div className="card" style={{ padding: '2rem 1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎟️</div>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
                Billetterie Officielle
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Accès nominatif et billets sécurisés par QR Code unique. Contrôle d&apos;entrée anti-fraude en temps réel.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem 1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✨</div>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
                Concepts Uniques
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Galas, bals à thème, soirées privées... Chaque événement possède sa propre scénographie et son dress code.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem 1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
                Accueil Privilégié
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Liaison directe par WhatsApp avec notre équipe pour valider vos réservations et répondre à vos questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOIRÉES (SHOTGUN STYLE) ── */}
      <section id="soirees" className={`section ${styles.eventsSection}`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Programmation Officielle</p>
            <h2 className={`font-serif ${styles.sectionTitle}`}>
              Prochaines <span className="text-gold">Soirées</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px', margin: '0.5rem auto 0' }}>
              Cliquez sur une soirée pour découvrir son thème complet, son adresse, ses prestations et réserver vos places.
            </p>
          </div>

          {events.length === 0 ? (
            <div className={styles.noEvents}>
              <span>👑</span>
              <p>Aucune soirée programmée pour le moment.</p>
              <p className="text-muted">Revenez bientôt pour découvrir nos prochains événements.</p>
            </div>
          ) : (
            <div className={styles.eventsGrid}>
              {events.map((event) => {
                const price = getActivePrice(event.ticketPhases)
                const isClosed = event.status === 'CLOSED'
                const displayLocation = (event.slug === 'bal-masque' && (!event.location || event.location === 'Paris, Île-de-France'))
                  ? "20, rue de l'Avenir, 93800 Épinay-sur-Seine"
                  : event.location
                return (
                  <Link
                    key={event.id}
                    href={`/soirees/${event.slug}`}
                    className={`card ${styles.eventCard}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {/* Poster */}
                    <div className={styles.eventPoster}>
                      {event.posterUrl ? (
                        <img src={event.posterUrl} alt={event.title} className={styles.eventPosterImg} />
                      ) : (
                        <div className={styles.eventPosterPlaceholder}>
                          <span>👑</span>
                        </div>
                      )}
                      <div className={styles.eventPosterOverlay} />

                      {price && (
                        <div className={styles.eventPrice}>
                          <span>{price}€</span>
                        </div>
                      )}

                      <div style={{
                        position: 'absolute',
                        bottom: '1rem',
                        left: '1rem',
                        zIndex: 2,
                      }}>
                        <span className={`badge ${isClosed ? 'badge-danger' : 'badge-success'}`}>
                          {isClosed ? 'Complet' : 'Billetterie Ouverte'}
                        </span>
                      </div>
                    </div>

                    {/* Infos */}
                    <div className={styles.eventBody}>
                      <h3 className={`font-serif ${styles.eventTitle}`}>{event.title}</h3>
                      {event.subtitle && (
                        <p className={styles.eventSubtitle}>{event.subtitle}</p>
                      )}

                      <div className={styles.eventMeta}>
                        <div className={styles.eventMetaItem}>
                          <span>📅</span>
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className={styles.eventMetaItem}>
                          <span>📍</span>
                          <span>{displayLocation}</span>
                        </div>
                        <div className={styles.eventMetaItem}>
                          <span>🕗</span>
                          <span>À partir de {event.timeStart}</span>
                        </div>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <div className={`btn btn-gold ${styles.eventCta}`} style={{ pointerEvents: 'none' }}>
                          Voir la soirée & réserver →
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.footerLogo}>
              <img
                src="/logo.png"
                alt="THE DISNASTY CIRCLE"
                style={{ height: '48px', width: 'auto', borderRadius: '4px' }}
              />
              <span style={{ fontWeight: 600, letterSpacing: '0.1em' }}>THE DISNASTY CIRCLE</span>
            </div>
            <p className={styles.footerTagline}>
              Prestige • Nightlife • Événements Exclusifs à Paris
            </p>
            <div className="divider-gold" style={{ maxWidth: '300px', margin: '1rem auto' }}>
              <span>ÉLÉGANCE</span><span>•</span><span>PRESTIGE</span><span>•</span><span>MYSTÈRE</span>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '1rem' }}>
              © {new Date().getFullYear()} THE DISNASTY CIRCLE. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
