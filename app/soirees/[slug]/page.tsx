import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Countdown from '@/components/Countdown'
import ReservationForm from '@/components/ReservationForm'
import LocationTransport from '@/components/LocationTransport'
import { STAFF_MEMBERS } from '@/lib/staffContacts'
import styles from './event.module.css'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

async function getEvent(slug: string) {
  try {
    return await prisma.event.findUnique({
      where: { slug },
      include: {
        ticketPhases: { orderBy: { order: 'asc' } },
      },
    })
  } catch {
    return null
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) return { title: 'Soirée introuvable' }
  return {
    title: `${event.title} — THE DISNASTY CIRCLE`,
    description: event.description ?? `Réservez votre billet pour ${event.title}`,
  }
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event || event.status === 'ARCHIVED') notFound()

  const isBalMasque = event.slug === 'bal-masque' || event.title.toLowerCase().includes('masque')

  // Normalized venue address & dress code with instantaneous fallback
  const displayLocation = (isBalMasque && (!event.location || event.location === 'Paris, Île-de-France'))
    ? "20, rue de l'Avenir, 93800 Épinay-sur-Seine"
    : (event.location || "20, rue de l'Avenir, 93800 Épinay-sur-Seine")

  const displayDressCode = (isBalMasque && (!event.dressCode || event.dressCode === 'Tenue élégante exigée'))
    ? "Tenue élégante & Masque obligatoires"
    : (event.dressCode || "Tenue élégante & Masque obligatoires")

  // Parse and normalize includes
  let includesList: string[] = []
  if (event.includes) {
    try {
      const parsed = JSON.parse(event.includes)
      includesList = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      includesList = [event.includes]
    }
  }

  // Update drink item if still single 'Boisson offerte'
  includesList = includesList.map(item => {
    if (item.trim().toLowerCase() === 'boisson offerte') {
      return '2 boissons offertes (au choix)'
    }
    return item
  })

  if (includesList.length === 0) {
    includesList = [
      '2 boissons offertes (au choix)',
      'Petite restauration',
    ]
  }

  const isClosed = event.status === 'CLOSED'
  const activePhasesForForm = event.ticketPhases.map(p => ({
    ...p,
    endDate: p.endDate ? p.endDate.toISOString() : null,
  }))

  return (
    <div className={styles.page}>
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <div className={`container ${styles.navInner}`}>
          <Link href="/" className={styles.navLogo}>
            <img src="/logo.png" alt="THE DISNASTY CIRCLE" style={{ height: '42px', width: 'auto', borderRadius: '4px' }} />
            <span className={styles.navLogoFull}>THE DISNASTY CIRCLE</span>
          </Link>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <Link href="/#soirees" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
              ← Toutes les soirées
            </Link>
            <Link href="/staff/login" className="btn btn-outline btn-sm">Staff</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        {event.posterUrl && (
          <img src={event.posterUrl} alt={event.title} className={styles.heroImage} />
        )}
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <p className={styles.heroEyebrow}>THE DISNASTY CIRCLE présente</p>
          <h1 className={`font-serif ${styles.heroTitle} text-shimmer`}>{event.title}</h1>
          {event.subtitle && (
            <p className={styles.heroSubtitle}>{event.subtitle}</p>
          )}
          <div className={styles.heroMeta}>
            <span>📅 {formatDate(event.date)}</span>
            <span className={styles.heroDot}>•</span>
            <span>📍 {displayLocation}</span>
            <span className={styles.heroDot}>•</span>
            <span>🕗 {event.timeStart}</span>
          </div>
        </div>
      </section>

      <div className={`container ${styles.content}`}>
        <div className={styles.grid}>

          {/* LEFT — Infos & Maps */}
          <div className={styles.left}>

            {/* Countdown */}
            <section className={styles.card}>
              <p className={styles.cardEyebrow}>La soirée commence dans</p>
              <Countdown targetDate={event.date.toISOString()} />
            </section>

            {/* Details */}
            <section className={styles.card}>
              <h2 className={`font-serif ${styles.cardTitle}`}>Détails de la soirée</h2>
              <div className={styles.detailList}>
                <div className={styles.detailItem}>
                  <span className={styles.detailIcon}>📅</span>
                  <div>
                    <p className={styles.detailLabel}>Date</p>
                    <p className={styles.detailValue}>{formatDate(event.date)}</p>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailIcon}>📍</span>
                  <div style={{ flex: 1 }}>
                    <p className={styles.detailLabel}>Lieu & Adresse</p>
                    <p className={styles.detailValue}>{displayLocation}</p>
                    <a
                      href="#transport-itineraire"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        marginTop: '0.35rem',
                        fontSize: '0.82rem',
                        color: 'var(--gold)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      🗺️ Voir le plan & évaluer mon itinéraire ↓
                    </a>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailIcon}>🕗</span>
                  <div>
                    <p className={styles.detailLabel}>Heure</p>
                    <p className={styles.detailValue}>À partir de {event.timeStart}</p>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailIcon}>👔</span>
                  <div>
                    <p className={styles.detailLabel}>Dress code & Exigence</p>
                    <p className={styles.detailValue} style={{ color: 'var(--gold)', fontWeight: 600 }}>
                      {displayDressCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Special Mask Notice for Bal Masqué */}
              {isBalMasque && (
                <div style={{
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  borderRadius: '10px',
                  padding: '0.9rem 1rem',
                  marginTop: '1.25rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🎭</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--gold)' }}>
                      Bal Masqué : Port du masque obligatoire dès l&apos;entrée
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    L&apos;accès à la soirée nécessite impérativement une tenue élégante et le port d&apos;un masque vénitien ou loup. Vous pouvez venir avec votre propre masque, ou sélectionner l&apos;option masque vénitien fourni sur place (+10€) dans le formulaire de réservation.
                  </p>
                </div>
              )}

              {/* Inclus dans votre billet */}
              <div className={styles.includes}>
                <p className={styles.detailLabel} style={{ marginBottom: '0.75rem' }}>Inclus dans votre billet</p>
                {includesList.filter(item => !item.toLowerCase().includes('bar à disposition')).map((item, i) => (
                  <div key={i} className={styles.includeItem}>
                    <span className={styles.includeDot}>✦</span>
                    <span><strong>{item}</strong></span>
                  </div>
                ))}

                {/* Highlighted Bar Service */}
                <div style={{
                  background: 'rgba(212, 175, 55, 0.06)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginTop: '0.85rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}>
                  <span style={{ fontSize: '1.3rem', marginTop: '-2px' }}>🍸</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--gold)', fontSize: '0.88rem' }}>
                      Bar à disposition toute la soirée
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      Deux boissons sont offertes avec votre entrée. Pour prolonger la fête, un bar complet est mis à la disposition des invités avec une sélection de boissons supplémentaires payantes (cocktails, alcools, champagnes, softs).
                    </p>
                  </div>
                </div>

                {/* DJ Highlight from official poster */}
                <div style={{
                  background: 'rgba(212, 175, 55, 0.06)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginTop: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  <span style={{ fontSize: '1.3rem' }}>🎧</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--gold)', fontSize: '0.88rem' }}>
                      DJ — Ambiance garantie jusqu&apos;au bout de la nuit !
                    </p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Animation musicale d&apos;exception dans une atmosphère prestige et festive.
                    </p>
                  </div>
                </div>
              </div>

              {event.description && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                  <p className={styles.detailLabel} style={{ marginBottom: '0.6rem' }}>Présentation de la soirée</p>
                  <p className={styles.description}>
                    {isBalMasque
                      ? `Une soirée inoubliable vous attend en Île-de-France ! Venez vêtus de votre plus belle tenue et parés de votre plus beau masque pour laisser la magie opérer. Attention : Bal masqué officiel, le port du masque et une tenue élégante sont strictement exigés à l'entrée. Deux boissons sont offertes à votre arrivée, et un bar complet reste à votre entière disposition toute la nuit pour toutes vos consommations supplémentaires.`
                      : event.description}
                  </p>
                </div>
              )}
            </section>

            {/* LOCATION, MAP & TRANSPORT CALCULATOR */}
            <LocationTransport address={displayLocation} venueName={event.title} />

            {/* OFFICIAL POSTER CARD */}
            <section className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 className={`font-serif ${styles.cardTitle}`} style={{ margin: 0, fontSize: '1.25rem' }}>
                  Affiche Officielle du Bal Masqué
                </h2>
                <a
                  href="/bal-masque-flyer.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.78rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}
                >
                  🔍 Agrandir l&apos;affiche
                </a>
              </div>
              <div style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
                textAlign: 'center',
                background: '#0a0a0a',
              }}>
                <a href="/bal-masque-flyer.jpg" target="_blank" rel="noopener noreferrer" title="Cliquer pour afficher en grand">
                  <img
                    src="/bal-masque-flyer.jpg"
                    alt="Affiche Officielle Bal Masqué - The Disnasty Circle"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </a>
              </div>
            </section>

            {/* Ticket phases */}
            {event.ticketPhases.length > 0 && (
              <section className={styles.card}>
                <h2 className={`font-serif ${styles.cardTitle}`}>Tarifs</h2>
                <div className={styles.phaseList}>
                  {event.ticketPhases.map(phase => {
                    const sold = phase.maxQuantity ? phase.soldCount >= phase.maxQuantity : false
                    const expired = phase.endDate ? new Date(phase.endDate) < new Date() : false
                    const unavailable = sold || expired || !phase.isActive
                    return (
                      <div key={phase.id} className={`${styles.phaseRow} ${unavailable ? styles.phaseRowDim : ''}`}>
                        <div>
                          <p className={styles.phaseName}>{phase.name}</p>
                          {phase.endDate && !expired && (
                            <p className={styles.phaseUntil}>
                              Jusqu&apos;au {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(phase.endDate))}
                            </p>
                          )}
                          {sold    && <p className={styles.phaseTag}>Épuisé</p>}
                          {expired && !sold && <p className={styles.phaseTag}>Expiré</p>}
                        </div>
                        <span className={`${styles.phasePrice} ${unavailable ? styles.phasePriceDim : ''}`}>
                          {phase.price}€
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT — Form */}
          <div className={styles.right}>
            <section className={`${styles.card} ${styles.formCard}`}>
              {isClosed ? (
                <div className={styles.closed}>
                  <span>🔒</span>
                  <h3 className="font-serif">Réservations fermées</h3>
                  <p>Les réservations pour cet événement sont clôturées.</p>
                </div>
              ) : (
                <>
                  <h2 className={`font-serif ${styles.cardTitle}`}>Réserver ma place</h2>
                  <p className={styles.formHint}>
                    Remplissez le formulaire puis finalisez votre réservation sur WhatsApp.
                  </p>
                  <ReservationForm
                    eventId={event.id}
                    eventSlug={event.slug}
                    eventTitle={event.title}
                    eventDate={formatDate(event.date)}
                    eventLocation={displayLocation}
                    eventTime={event.timeStart}
                    phases={activePhasesForForm}
                    whatsappNumber={event.whatsappNumber}
                  />
                </>
              )}
            </section>

            {/* Assistance WhatsApp & Informations VIP */}
            <section className={styles.card} style={{ marginTop: '1.25rem', borderColor: 'rgba(37, 211, 102, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>💬</span>
                <h3 className="font-serif" style={{ color: 'var(--gold)', margin: 0, fontSize: '1.15rem' }}>
                  Une question avant de réserver ?
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                Notre équipe est à votre disposition directe sur WhatsApp pour toute demande d&apos;information (dress code, accès, réservation de salon ou table VIP) :
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {STAFF_MEMBERS.map(member => {
                  const defaultMsg = encodeURIComponent(
                    `Bonjour THE DISNASTY CIRCLE,\n\nJe souhaite avoir des informations avant de réserver pour la soirée *${event.title}* (${formatDate(event.date)}).\nLieu : ${displayLocation}`
                  )
                  const waUrl = `https://api.whatsapp.com/send?phone=${member.cleanPhone}&text=${defaultMsg}`

                  return (
                    <a
                      key={member.id}
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderColor: 'rgba(37, 211, 102, 0.35)',
                        padding: '0.65rem 0.9rem',
                        fontSize: '0.86rem',
                        color: 'var(--text)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{member.flag}</span>
                        <div>
                          <strong style={{ display: 'block', color: 'var(--text)', fontSize: '0.86rem' }}>
                            {member.country}
                          </strong>
                          <span style={{ color: 'var(--gold)', fontSize: '0.78rem' }}>
                            {member.display}
                          </span>
                        </div>
                      </div>
                      <span style={{
                        color: '#25D366',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}>
                        📲 Écrire
                      </span>
                    </a>
                  )
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
