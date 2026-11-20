'use client'

import { useState } from 'react'
import styles from './ReservationForm.module.css'
import { STAFF_MEMBERS, getStaffForCountryCode, StaffMember } from '@/lib/staffContacts'

interface Phase {
  id: string
  name: string
  price: number
  maxQuantity: number | null
  soldCount: number
  endDate: string | null
  isActive: boolean
}

interface ReservationFormProps {
  eventId: string
  eventSlug: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  eventTime: string
  phases: Phase[]
  whatsappNumber: string
  maskPrice?: number
  hasMaskOption?: boolean
}

const COUNTRY_OPTIONS = [
  { code: '+32', flag: '🇧🇪', label: 'Belgique (+32)', placeholder: '465 69 05 96' },
  { code: '+49', flag: '🇩🇪', label: 'Allemagne (+49)', placeholder: '163 261 31 18' },
  { code: '+33', flag: '🇫🇷', label: 'France (+33)', placeholder: '6 12 34 56 78' },
  { code: '+237', flag: '🇨🇲', label: 'Cameroun (+237)', placeholder: '6 12 34 56 78' },
  { code: '+41', flag: '🇨🇭', label: 'Suisse (+41)', placeholder: '78 123 45 67' },
  { code: '+44', flag: '🇬🇧', label: 'UK (+44)', placeholder: '7123 456789' },
  { code: '+1', flag: '🇺🇸', label: 'USA / Canada (+1)', placeholder: '555 123 4567' },
  { code: '+225', flag: '🇨🇮', label: 'Côte d\'Ivoire (+225)', placeholder: '07 12 34 56 78' },
  { code: '+221', flag: '🇸🇳', label: 'Sénégal (+221)', placeholder: '77 123 45 67' },
  { code: 'OTHER', flag: '🌍', label: 'Autre pays (saisie libre avec indicatif)', placeholder: '+XXX ...' },
]

function buildWhatsAppMessage(data: {
  firstName: string
  lastName: string
  fullPhone: string
  email: string
  ticketCount: number
  maskCount: number
  phaseName: string
  phasePrice: number
  maskPrice: number
  eventTitle: string
  eventDate: string
  eventLocation: string
}) {
  const maskTotal = data.maskCount * data.maskPrice
  const total = (data.phasePrice * data.ticketCount) + maskTotal
  const maskLine = data.maskCount > 0
    ? `• Masque(s) sur place : *${data.maskCount}x* (+${maskTotal}€)\n`
    : ''

  const message = `Bonjour THE DISNASTY CIRCLE,

Je m'appelle *${data.firstName} ${data.lastName}* et je souhaite reserver *${data.ticketCount} billet(s)* pour :

• Soiree : *${data.eventTitle}*
• Date : *${data.eventDate}*
• Lieu : *${data.eventLocation}*

• Categorie : *${data.phaseName}* (${data.phasePrice}€/billet)
${maskLine}• Total a regler : *${total}€*

• Mon email : *${data.email}*
• Mon telephone : *${data.fullPhone}*

Merci et a tres bientot !`

  return encodeURIComponent(message)
}

export default function ReservationForm({
  eventId,
  eventSlug,
  eventTitle,
  eventDate,
  eventLocation,
  eventTime,
  phases,
  whatsappNumber,
  maskPrice = 10,
  hasMaskOption,
}: ReservationFormProps) {
  const showMask = hasMaskOption ?? (eventSlug.toLowerCase().includes('masque') || eventTitle.toLowerCase().includes('masque'))
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookingType, setBookingType] = useState<'INDIVIDUAL' | 'TABLE'>('INDIVIDUAL')
  const [tableSeats, setTableSeats] = useState(6)
  const [tableMasks, setTableMasks] = useState(2) // Default to 2 or 0, freely adjustable

  const [selectedCountryCode, setSelectedCountryCode] = useState('+32') // Default to Belgique or France
  const [phoneRaw, setPhoneRaw] = useState('')
  const [assignedStaff, setAssignedStaff] = useState<StaffMember>(STAFF_MEMBERS[0])
  const [encodedMessage, setEncodedMessage] = useState('')

  function isPhaseDisabled(phase: Phase) {
    if (!phase.isActive) return true
    if (phase.maxQuantity && phase.soldCount >= phase.maxQuantity) return true
    if (phase.endDate && new Date(phase.endDate) < new Date()) return true
    return false
  }

  const initialPhase = phases.find(p => !isPhaseDisabled(p)) || phases[0]

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    ticketCount: 1,
    maskCount: 0,
    phaseId: initialPhase?.id ?? '',
    message: '',
  })

  const selectedPhase = phases.find(p => p.id === form.phaseId)
  const ticketTotal = selectedPhase ? selectedPhase.price * form.ticketCount : 0
  const maskTotal   = (showMask ? form.maskCount * maskPrice : 0)
  const grandTotal  = ticketTotal + maskTotal

  const currentCountry = COUNTRY_OPTIONS.find(c => c.code === selectedCountryCode) || COUNTRY_OPTIONS[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanRawPhone = phoneRaw.trim()
    if (!form.firstName || !form.lastName || !form.email || !cleanRawPhone) {
      setError('Veuillez renseigner votre prénom, nom, email et numéro WhatsApp.')
      return
    }

    const fullPhone = selectedCountryCode === 'OTHER'
      ? cleanRawPhone
      : `${selectedCountryCode} ${cleanRawPhone}`

    const staff = getStaffForCountryCode(selectedCountryCode)
    setAssignedStaff(staff)

    setLoading(true)
    try {
      const isTable = bookingType === 'TABLE'
      const payload = isTable ? {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: fullPhone,
        ticketCount: tableSeats,
        wantsMask: tableMasks > 0,
        maskCount: tableMasks,
        isTable: true,
        tableName: `Table VIP (${tableSeats} pers.)`,
        message: form.message,
        eventId,
        eventSlug,
      } : {
        ...form,
        phone: fullPhone,
        wantsMask: form.maskCount > 0,
        maskCount: form.maskCount,
        eventId,
        eventSlug,
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la réservation.')

      let msg = ''
      if (isTable) {
        const rawMsg =
          `Bonjour THE DISNASTY CIRCLE,\n\n` +
          `Je m'appelle *${form.firstName} ${form.lastName}* et je souhaite reserver une *TABLE VIP* pour la soiree *${eventTitle}* :\n\n` +
          `• Date : *${eventDate}*\n` +
          `• Lieu : *${eventLocation}*\n` +
          `• Nombre d'invites prevu : *${tableSeats} personnes*\n` +
          `• Masques sur place : *${tableMasks > 0 ? `${tableMasks} masque(s) pour la table` : 'Aucun (les invites viennent avec leurs masques)'}*\n` +
          (form.message ? `• Demande particuliere : ${form.message}\n` : '') +
          `• Mon email : *${form.email}*\n` +
          `• Mon telephone : *${fullPhone}*\n\n` +
          `Pourriez-vous me transmettre les options de tables disponibles, modalites et la carte des bouteilles ? Merci !`
        msg = encodeURIComponent(rawMsg)
      } else {
        msg = buildWhatsAppMessage({
          firstName:   form.firstName,
          lastName:    form.lastName,
          fullPhone,
          email:       form.email,
          ticketCount: form.ticketCount,
          maskCount:   form.maskCount,
          phaseName:   selectedPhase?.name ?? 'Standard',
          phasePrice:  selectedPhase?.price ?? 0,
          maskPrice,
          eventTitle,
          eventDate,
          eventLocation,
        })
      }

      setEncodedMessage(msg)
      setStep('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    const primaryUrl = `https://api.whatsapp.com/send?phone=${assignedStaff.cleanPhone}&text=${encodedMessage}`

    return (
      <div className={styles.success}>
        <div className={styles.successIcon}>✅</div>
        <h3 className={`font-serif ${styles.successTitle}`}>Demande enregistrée !</h3>
        <p className={styles.successText}>
          Votre réservation pour <strong>{eventTitle}</strong> est bien enregistrée dans notre système.<br />
          Pour la valider définitivement et obtenir votre e-billet, contactez notre équipe sur WhatsApp :
        </p>

        {/* Assigned Staff Button */}
        <div style={{
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid var(--gold)',
          borderRadius: '12px',
          padding: '1.25rem',
          margin: '1.25rem 0',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            {assignedStaff.flag} Référent WhatsApp recommandé pour votre région :
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            {assignedStaff.role} ({assignedStaff.display})
          </p>

          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Finaliser avec le Staff {assignedStaff.country} →
          </a>
        </div>

        {/* Other Staff Members */}
        <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            Ou contactez un autre référent selon votre convenance :
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {STAFF_MEMBERS.filter(s => s.id !== assignedStaff.id).map(s => {
              const otherUrl = `https://api.whatsapp.com/send?phone=${s.cleanPhone}&text=${encodedMessage}`
              return (
                <a
                  key={s.id}
                  href={otherUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.9rem' }}
                >
                  <span>{s.flag} {s.role}</span>
                  <span style={{ color: '#25D366', fontWeight: 600, fontSize: '0.85rem' }}>💬 {s.display}</span>
                </a>
              )
            })}
          </div>
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '0.85rem 1rem',
          background: 'rgba(212, 175, 55, 0.05)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '8px',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          lineHeight: '1.5'
        }}>
          💡 <strong>Email & Billet :</strong> Dès confirmation de votre règlement, votre e-billet avec QR code vous est envoyé par email sur <strong style={{ color: 'var(--gold)' }}>{form.email}</strong> et disponible sur WhatsApp.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* SÉLECTEUR BILLET INDIVIDUEL OU TABLE VIP */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.25rem',
        padding: '0.35rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        border: '1px solid var(--border)'
      }}>
        <button
          type="button"
          onClick={() => setBookingType('INDIVIDUAL')}
          className={`btn btn-sm ${bookingType === 'INDIVIDUAL' ? 'btn-gold' : 'btn-outline'}`}
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
        >
          🎟️ Billets Individuels
        </button>
        <button
          type="button"
          onClick={() => setBookingType('TABLE')}
          className={`btn btn-sm ${bookingType === 'TABLE' ? 'btn-gold' : 'btn-outline'}`}
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
        >
          🍾 Table VIP & Salons
        </button>
      </div>

      {bookingType === 'TABLE' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(20, 16, 5, 0.7) 100%)',
          border: '1px solid var(--gold)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.25rem',
          fontSize: '0.86rem',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '0.98rem', marginBottom: '0.3rem' }}>
            🍾 Espace Privilège & Tables VIP
          </strong>
          Accès coupe-file prioritaire, table réservée, service bouteilles & masques. Les modalités et tarifs dépendent du choix de vos bouteilles et sont finalisés directement sur WhatsApp avec votre référent.
        </div>
      )}

      {/* Phase selection (uniquement en individuel) */}
      {bookingType === 'INDIVIDUAL' && phases.length > 1 && (
        <div className={styles.phases}>
          <p className="form-label" style={{ marginBottom: '0.75rem' }}>Catégorie de billet</p>
          <div className={styles.phaseGrid}>
            {phases.map(phase => {
              const disabled = isPhaseDisabled(phase)
              const selected = form.phaseId === phase.id
              return (
                <button
                  key={phase.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setForm(f => ({ ...f, phaseId: phase.id }))}
                  className={`${styles.phaseBtn} ${selected ? styles.phaseBtnActive : ''} ${disabled ? styles.phaseBtnDisabled : ''}`}
                >
                  <span className={styles.phaseName}>{phase.name}</span>
                  {phase.endDate && (
                    <span style={{ fontSize: '0.7rem', color: disabled ? 'var(--text-dim)' : 'var(--gold)', display: 'block', marginTop: '2px' }}>
                      {disabled ? 'Terminé' : `Dispo jusqu'au ${new Date(phase.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                    </span>
                  )}
                  <span className={styles.phasePrice}>
                    {disabled ? 'Épuisé' : `${phase.price}€`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Name row */}
      <div className={styles.row}>
        <div className="form-group">
          <label className="form-label">Prénom *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Jean"
            value={form.firstName}
            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nom *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Dupont"
            value={form.lastName}
            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="form-group">
        <label className="form-label">Email * <span className={styles.labelHint}>(réception du billet)</span></label>
        <input
          type="email"
          className="form-input"
          placeholder="jean@exemple.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
        />
      </div>

      {/* International Phone */}
      <div className="form-group">
        <label className="form-label">Numéro WhatsApp (Tous pays acceptés) *</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="form-input"
            value={selectedCountryCode}
            onChange={e => setSelectedCountryCode(e.target.value)}
            style={{ flex: '1 1 180px', maxWidth: '240px', background: '#141414', color: '#fff', borderColor: 'var(--border)' }}
          >
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code} style={{ background: '#141414', color: '#fff' }}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            className="form-input"
            placeholder={currentCountry.placeholder}
            value={phoneRaw}
            onChange={e => setPhoneRaw(e.target.value)}
            style={{ flex: '2 1 200px' }}
            required
          />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          🌍 Valable pour tous les pays (Belgique, Allemagne, France, Cameroun, etc.).
        </p>
      </div>

      {/* Ticket count (Individuel) ou Table Seats (Table VIP) */}
      {bookingType === 'INDIVIDUAL' ? (
        <>
          <div className="form-group">
            <label className="form-label">Nombre de billets *</label>
            <div className={styles.counter}>
              <button
                type="button"
                className={styles.counterBtn}
                onClick={() => setForm(f => {
                  const newCount = Math.max(1, f.ticketCount - 1)
                  return { ...f, ticketCount: newCount, maskCount: Math.min(newCount, f.maskCount) }
                })}
              >−</button>
              <span className={styles.counterValue}>{form.ticketCount}</span>
              <button
                type="button"
                className={styles.counterBtn}
                onClick={() => setForm(f => ({ ...f, ticketCount: Math.min(10, f.ticketCount + 1) }))}
              >+</button>
            </div>
          </div>

          {/* Mask option (uniquement pour les événements masqués) */}
          {showMask && (
            <div style={{
              background: 'rgba(212, 175, 55, 0.06)',
              border: '1px solid var(--gold-border)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--gold)', margin: 0, fontSize: '0.95rem' }}>
                    🎭 Masque vénitien sur place (+{maskPrice}€ / unité)
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                    Combien d&apos;invités ont besoin d&apos;un masque fourni sur place ?
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setForm(f => ({ ...f, maskCount: Math.max(0, f.maskCount - 1) }))}
                    disabled={form.maskCount <= 0}
                    style={{ width: '34px', height: '34px', padding: 0, fontSize: '1.2rem', lineHeight: '1' }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 700, fontSize: '1.15rem', color: form.maskCount > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>
                    {form.maskCount}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setForm(f => ({ ...f, maskCount: Math.min(form.ticketCount, f.maskCount + 1) }))}
                    disabled={form.maskCount >= form.ticketCount}
                    style={{ width: '34px', height: '34px', padding: 0, fontSize: '1.2rem', lineHeight: '1' }}
                  >
                    +
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: form.maskCount > 0 ? 'var(--gold)' : 'var(--text-dim)', marginTop: '0.5rem', marginBottom: 0 }}>
                {form.maskCount === 0
                  ? 'Aucun masque ajouté (vous venez avec vos propres masques)'
                  : `✓ ${form.maskCount} masque${form.maskCount > 1 ? 's' : ''} sur place (+${form.maskCount * maskPrice}€) pour vos ${form.ticketCount} place${form.ticketCount > 1 ? 's' : ''}`}
              </p>
            </div>
          )}
        </>
      ) : (
        /* Configuration Table VIP */
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Nombre d&apos;invités assis à la table *</label>
            <select
              className="form-input"
              value={tableSeats}
              onChange={e => {
                const val = parseInt(e.target.value)
                setTableSeats(val)
                setTableMasks(m => Math.min(m, val))
              }}
              style={{ background: '#141414', color: '#fff' }}
            >
              {[2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => (
                <option key={n} value={n}>{n} personnes</option>
              ))}
            </select>
          </div>

          <div style={{
            background: 'rgba(212, 175, 55, 0.08)',
            border: '1px solid var(--gold-border)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginTop: '0.85rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--gold)', margin: 0, fontSize: '0.95rem' }}>
                  🎭 Masques vénitiens sur place pour votre table
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                  Combien de masques à prévoir pour vos {tableSeats} invités ?
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setTableMasks(m => Math.max(0, m - 1))}
                  disabled={tableMasks <= 0}
                  style={{ width: '36px', height: '36px', padding: 0, fontSize: '1.2rem', lineHeight: '1' }}
                >
                  −
                </button>
                <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 700, fontSize: '1.2rem', color: tableMasks > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {tableMasks}
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setTableMasks(m => Math.min(tableSeats, m + 1))}
                  disabled={tableMasks >= tableSeats}
                  style={{ width: '36px', height: '36px', padding: 0, fontSize: '1.2rem', lineHeight: '1' }}
                >
                  +
                </button>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: tableMasks > 0 ? 'var(--gold)' : 'var(--text-dim)', marginTop: '0.6rem', marginBottom: 0 }}>
              {tableMasks === 0
                ? '❌ Aucun masque sur place (vos invités viennent avec leurs propres masques)'
                : `✓ ${tableMasks} masque${tableMasks > 1 ? 's' : ''} fourni${tableMasks > 1 ? 's' : ''} sur place pour votre table de ${tableSeats} personne${tableSeats > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      <div className="form-group">
        <label className="form-label">{bookingType === 'TABLE' ? 'Préférences de bouteilles ou salon (optionnel)' : 'Message (optionnel)'}</label>
        <textarea
          className="form-input"
          placeholder={bookingType === 'TABLE' ? 'Ex : 2x Dom Pérignon, 1x Belvedere, salon près du DJ...' : 'Une question ou une demande particulière...'}
          rows={3}
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
        />
      </div>

      {/* Total pour individuel OU Récapitulatif Table */}
      {bookingType === 'INDIVIDUAL' ? (
        <div className={styles.total}>
          <div className={styles.totalRow}>
            <span>Billets ({form.ticketCount} × {selectedPhase?.price ?? 0}€)</span>
            <span>{ticketTotal}€</span>
          </div>
          {form.maskCount > 0 && (
            <div className={styles.totalRow}>
              <span>Masques ({form.maskCount} × {maskPrice}€)</span>
              <span>{maskTotal}€</span>
            </div>
          )}
          <div className={`${styles.totalRow} ${styles.totalFinal}`}>
            <span>Total</span>
            <span className="text-gold">{grandTotal}€</span>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.25rem',
          textAlign: 'center',
          fontSize: '0.88rem',
        }}>
          <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.95rem' }}>
            🍾 Table VIP ({tableSeats} personnes) · Sur Devis Personnalisé
          </span>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Le montant sera fixé en direct sur WhatsApp selon vos bouteilles, puis les billets individuels vous seront envoyés.
          </p>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className="btn btn-gold btn-lg" disabled={loading} style={{ width: '100%' }}>
        {loading ? (
          <><span className="spinner" style={{ width: 18, height: 18 }} /> Enregistrement en cours...</>
        ) : bookingType === 'TABLE' ? (
          '🍾 Réserver ma Table VIP sur WhatsApp →'
        ) : (
          'Continuer vers la finalisation WhatsApp →'
        )}
      </button>

      <p className={styles.disclaimer}>
        📬 Votre e-billet vous sera envoyé par email dès confirmation de votre règlement.
      </p>
    </form>
  )
}
