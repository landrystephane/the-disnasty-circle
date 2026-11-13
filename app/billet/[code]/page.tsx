import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'
import Link from 'next/link'
import styles from './billet.module.css'
import PrintButton from './PrintButton'

interface Props {
  params: Promise<{ code: string }>
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  const ticket = await prisma.ticket.findUnique({
    where: { qrCode: code },
    include: {
      reservation: {
        include: { event: true },
      },
    },
  })

  if (!ticket) return { title: 'Billet Introuvable' }
  return {
    title: `Billet Officiel — ${ticket.reservation.event.title} | THE DYNASTY CIRCLE`,
    description: `Billet d'entrée pour ${ticket.reservation.firstName} ${ticket.reservation.lastName}`,
  }
}

export default async function BilletPage({ params }: Props) {
  const { code } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { qrCode: code },
    include: {
      reservation: {
        include: {
          event: true,
          phase: true,
          tickets: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  })

  if (!ticket) notFound()

  const r = ticket.reservation
  const event = r.event
  const hasMask = (ticket as any).hasMask ?? r.wantsMask
  const ticketNumber = (ticket as any).ticketNumber ?? 1
  const totalTickets = r.ticketCount

  const qrDataUrl = await QRCode.toDataURL(ticket.qrCode, {
    width: 320,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  })

  const shareText = encodeURIComponent(
    `Bonjour ${r.firstName} ! Voici votre e-billet officiel (${ticketNumber}/${totalTickets}) pour *${event.title}* : ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/billet/${ticket.qrCode}`
  )
  const clientPhone = r.phone ? r.phone.replace(/\D/g, '') : ''
  const waShareUrl = clientPhone
    ? `https://api.whatsapp.com/send?phone=${clientPhone}&text=${shareText}`
    : `https://api.whatsapp.com/send?text=${shareText}`

  return (
    <div className={styles.wrapper}>
      {/* Top Bar (No Print) */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.brand}>
          <img src="/logo.png" alt="THE DYNASTY CIRCLE" style={{ height: '36px', width: 'auto', borderRadius: '4px' }} />
          <span>THE DYNASTY CIRCLE</span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <PrintButton />
          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
          >
            📲 WhatsApp
          </a>
        </div>
      </div>

      {/* Multi-Ticket Switcher if more than 1 ticket */}
      {r.tickets && r.tickets.length > 1 && (
        <div style={{
          maxWidth: '680px',
          margin: '0 auto 1.25rem',
          padding: '0.75rem 1rem',
          background: 'rgba(20, 20, 20, 0.7)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '12px',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.3rem' }}>
            Tous vos billets ({r.tickets.length}) :
          </span>
          {r.tickets.map((t: any, idx: number) => {
            const isCur = t.qrCode === ticket.qrCode
            const tNum = t.ticketNumber || (idx + 1)
            return (
              <Link
                key={t.id}
                href={`/billet/${t.qrCode}`}
                className={`btn btn-sm ${isCur ? 'btn-gold' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.82rem' }}
              >
                Billet #{tNum} {t.hasMask ? '🎭' : ''}
              </Link>
            )
          })}
        </div>
      )}

      {/* Ticket Card Container */}
      <div className={styles.ticketContainer}>
        <div className={styles.ticketCard}>
          {/* Header */}
          <div className={styles.ticketHeader}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <img
                src="/logo.png"
                alt="THE DYNASTY CIRCLE"
                style={{ height: '75px', width: 'auto', borderRadius: '6px', filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.4))' }}
              />
            </div>
            <p className={styles.eyebrow}>
              THE DYNASTY CIRCLE • BILLET {ticketNumber} SUR {totalTickets}
            </p>
            <h1 className={styles.eventTitle}>{event.title}</h1>
            {event.subtitle && <p className={styles.eventSubtitle}>{event.subtitle}</p>}

            {/* Alerte si réservation annulée */}
            {r.status === 'CANCELLED' && (
              <div style={{
                margin: '1rem auto 0',
                maxWidth: '520px',
                padding: '0.85rem 1rem',
                background: 'rgba(231, 76, 60, 0.25)',
                border: '2px solid #e74c3c',
                borderRadius: '8px',
                color: '#ff6b6b',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}>
                🛑 RÉSERVATION ANNULÉE — BILLET RÉVOQUÉ
                <p style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: '0.25rem', color: '#ffcccc' }}>
                  Ce titre d&apos;accès a été désactivé par l&apos;organisation. L&apos;entrée sera strictement refusée à l&apos;accueil.
                </p>
              </div>
            )}
          </div>

          {/* Details Row */}
          <div className={styles.ticketBody}>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>📅 Date</span>
                <span className={styles.metaValue}>{formatDate(event.date)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>🕗 Heure d&apos;arrivée</span>
                <span className={styles.metaValue}>Dès {event.timeStart}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>📍 Lieu</span>
                <span className={styles.metaValue}>{event.location}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>👔 Dress code</span>
                <span className={styles.metaValueGold}>{event.dressCode || 'Tenue élégante exigée'}</span>
              </div>
            </div>

            {/* Guest & Tier */}
            <div className={styles.guestBox}>
              <div>
                <p className={styles.metaLabel}>Invité(e)</p>
                <p className={styles.guestName}>
                  {r.firstName} {r.lastName} {totalTickets > 1 ? `(Invité #${ticketNumber})` : ''}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                  {r.email} {r.phone ? `• ${r.phone}` : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className={styles.metaLabel}>Catégorie & Dotation</p>
                <p className={styles.tierName}>{r.phase?.name ?? 'Entrée standard'}</p>
                {hasMask ? (
                  <span style={{
                    display: 'inline-block',
                    background: 'rgba(212, 175, 55, 0.25)',
                    border: '1px solid var(--gold)',
                    color: 'var(--gold)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    marginTop: '0.3rem'
                  }}>
                    🎭 Masque Inclus (À retirer à l&apos;accueil)
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-block',
                    background: '#222',
                    border: '1px solid #444',
                    color: '#888',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    marginTop: '0.3rem'
                  }}>
                    Entrée Simple (Sans masque sur place)
                  </span>
                )}
              </div>
            </div>

            {/* QR Code Section */}
            <div className={styles.qrSection}>
              {r.status === 'CANCELLED' ? (
                <div style={{
                  padding: '2.5rem 1rem',
                  border: '2px dashed #e74c3c',
                  borderRadius: '12px',
                  background: 'rgba(231, 76, 60, 0.08)',
                  textAlign: 'center',
                  margin: '1rem auto',
                  maxWidth: '320px'
                }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🚫</span>
                  <p style={{ color: '#e74c3c', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.05em', margin: 0 }}>
                    ACCÈS INTERDIT
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.4rem' }}>
                    QR Code désactivé
                  </p>
                </div>
              ) : (
                <>
                  <p className={styles.qrLabel}>SCAN D&apos;ENTRÉE STRICTEMENT PERSONNEL</p>
                  <div className={styles.qrFrame}>
                    <img src={qrDataUrl} alt="QR Code d'accès" className={styles.qrImage} />
                  </div>
                  <p className={styles.ticketRef}>
                    REF : <span>{ticket.qrCode.slice(0, 13).toUpperCase()}</span>
                  </p>
                  <p className={styles.doorNotice}>
                    ⏰ <strong>Attention à la fermeture des portes :</strong> L&apos;accès et la validation des billets ferment 2h après le début de la soirée. Aucun retardataire ne sera admis.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Ticket Footer */}
          <div className={styles.ticketFooter}>
            <p>Ce billet est strictement personnel et non cessible. 1 scan unique à l&apos;entrée.</p>
            <p style={{ marginTop: '0.3rem', color: 'var(--gold)', fontSize: '0.75rem' }}>
              THE DYNASTY CIRCLE • ÉLÉGANCE • PASSION • MYSTÈRE
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}