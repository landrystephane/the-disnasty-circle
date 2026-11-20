import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Countdown from '@/components/Countdown'
import ReservationForm from '@/components/ReservationForm'
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

  const includes: string[] = event.includes ? JSON.parse(event.includes) : []
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
            <span>📍 {event.location}</span>
            <span className={styles.heroDot}>•</span>
            <span>🕗 {event.timeStart}</span>
          </div>
        </div>
      </section>

      <div className={`container ${styles.content}`}>
        <div className={styles.grid}>

          {/* LEFT — Infos */}
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
                  <div>
                    <p className={styles.detailLabel}>Lieu</p>
                    <p className={styles.detailValue}>{event.location}</p>
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailIcon}>🕗</span>
                  <div>
                    <p className={styles.detailLabel}>Heure</p>
                    <p className={styles.detailValue}>À partir de {event.timeStart}</p>
                  </div>
                </div>
                {event.dressCode && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>👔</span>
                    <div>
                      <p className={styles.detailLabel}>Dress code</p>
                      <p className={styles.detailValue}>{event.dressCode}</p>
                    </div>
                  </div>
                )}
              </div>

              {includes.length > 0 && (
                <div className={styles.includes}>
                  <p className={styles.detailLabel} style={{ marginBottom: '0.6rem' }}>Inclus dans votre billet</p>
                  {includes.map((item, i) => (
                    <div key={i} className={styles.includeItem}>
                      <span className={styles.includeDot}>✦</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {event.description && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                  <p className={styles.detailLabel} style={{ marginBottom: '0.6rem' }}>Présentation de la soirée</p>
                  <p className={styles.description}>{event.description}</p>
                </div>
              )}
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
                    eventLocation={event.location}
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
                    `Bonjour THE DISNASTY CIRCLE,\n\nJe souhaite avoir des informations avant de réserver pour la soirée *${event.title}* (${formatDate(event.date)}).`
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
