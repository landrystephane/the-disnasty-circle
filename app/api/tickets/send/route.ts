import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date))
}

function buildMultiTicketHtml(params: {
  firstName: string
  lastName: string
  eventTitle: string
  eventSubtitle?: string | null
  eventDate: string
  eventLocation: string
  eventTime: string
  dressCode: string
  phaseName: string
  ticketCount: number
  maskCount: number
  totalAmount: number
  tickets: { qrCode: string; ticketNumber: number; hasMask: boolean }[]
  baseUrl: string
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vos billets — ${params.eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#090909;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:640px;margin:0 auto;background:#111111;border:1px solid #2a2a2a;">

  <!-- Header avec Logo Officiel intégré (CID) -->
  <div style="background:linear-gradient(135deg,#0d0a02 0%,#1f1807 100%);border-bottom:2px solid #D4AF37;padding:2.5rem 1.5rem 1.75rem;text-align:center;">
    <div style="margin-bottom:12px;">
      <img src="cid:dynasty-logo" alt="THE DISNASTY CIRCLE" width="105" height="105" style="display:block;margin:0 auto;border-radius:10px;border:1px solid rgba(212,175,55,0.4);" />
    </div>
    <p style="margin:0;font-size:0.75rem;letter-spacing:0.25em;text-transform:uppercase;color:#D4AF37;font-weight:700;">THE DISNASTY CIRCLE • BILLETS OFFICIELS</p>
    <h1 style="margin:0.5rem 0 0.25rem;font-size:2.2rem;color:#ffffff;letter-spacing:0.04em;">${params.eventTitle}</h1>
    ${params.eventSubtitle ? `<p style="margin:0;font-size:0.8rem;letter-spacing:0.18em;text-transform:uppercase;color:#c5a960;">${params.eventSubtitle}</p>` : ''}
  </div>

  <!-- Event Info -->
  <div style="padding:1.5rem 2rem;border-bottom:1px solid #222222;background:#141414;">
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
      <tr>
        <td style="padding:0.4rem 0;color:#9E8E6E;width:35%;">📅 Date</td>
        <td style="padding:0.4rem 0;color:#F5F0E8;font-weight:600;">${params.eventDate}</td>
      </tr>
      <tr>
        <td style="padding:0.4rem 0;color:#9E8E6E;">📍 Lieu</td>
        <td style="padding:0.4rem 0;color:#F5F0E8;font-weight:600;">${params.eventLocation}</td>
      </tr>
      <tr>
        <td style="padding:0.4rem 0;color:#9E8E6E;">🕗 Heure</td>
        <td style="padding:0.4rem 0;color:#F5F0E8;font-weight:600;">Dès ${params.eventTime}</td>
      </tr>
      <tr>
        <td style="padding:0.4rem 0;color:#9E8E6E;">👔 Dress code</td>
        <td style="padding:0.4rem 0;color:#D4AF37;font-weight:600;">${params.dressCode}</td>
      </tr>
    </table>
  </div>

  <!-- Récapitulatif Commande -->
  <div style="padding:1.25rem 2rem;border-bottom:1px dashed rgba(212,175,55,0.3);background:#0d0d0d;">
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
      <tr>
        <td style="color:#888;padding:3px 0;">Réservé au nom de :</td>
        <td style="color:#fff;font-weight:700;text-align:right;">${params.firstName} ${params.lastName}</td>
      </tr>
      <tr>
        <td style="color:#888;padding:3px 0;">Nombre total de billets :</td>
        <td style="color:#D4AF37;font-weight:700;text-align:right;">${params.ticketCount} place(s) (${params.phaseName})</td>
      </tr>
      <tr>
        <td style="color:#888;padding:3px 0;">Option masque sur place :</td>
        <td style="color:#D4AF37;font-weight:700;text-align:right;">${params.maskCount > 0 ? `${params.maskCount} masque(s) réservé(s)` : 'Aucun masque sur place'}</td>
      </tr>
      <tr>
        <td style="color:#888;padding:3px 0;">Montant total réglé :</td>
        <td style="color:#2ecc71;font-weight:700;font-size:1.05rem;text-align:right;">${params.totalAmount}€</td>
      </tr>
    </table>
  </div>

  <!-- LISTE DES BILLETS NUMÉROTÉS -->
  <div style="padding:1.5rem 1rem;">
    <p style="margin:0 0 1.25rem 1rem;font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;color:#D4AF37;font-weight:700;">
      VOS BILLETS INDIVIDUELS (${params.ticketCount})
    </p>

    ${params.tickets.map(t => `
      <div style="background:#090909;border:2px solid #D4AF37;border-radius:12px;margin-bottom:1.75rem;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,0.7);">
        <!-- Card Top Bar -->
        <div style="background:linear-gradient(90deg,#1c1708,#121212);padding:0.9rem 1.25rem;border-bottom:1px solid rgba(212,175,55,0.3);">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="text-align:left;">
                <span style="font-size:0.95rem;font-weight:800;color:#D4AF37;letter-spacing:0.08em;text-transform:uppercase;">
                  🎟️ BILLET ${t.ticketNumber} SUR ${params.ticketCount}
                </span>
              </td>
              <td style="text-align:right;">
                ${t.hasMask ? `
                  <span style="background:rgba(212,175,55,0.2);border:1px solid #D4AF37;color:#D4AF37;padding:5px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;letter-spacing:0.05em;display:inline-block;">
                    🎭 MASQUE INCLUS
                  </span>
                ` : `
                  <span style="background:#1e1e1e;border:1px solid #444;color:#999;padding:5px 10px;border-radius:20px;font-size:0.75rem;display:inline-block;">
                    ENTRÉE SIMPLE
                  </span>
                `}
              </td>
            </tr>
          </table>
        </div>

        <!-- Card Content -->
        <div style="padding:1.5rem;text-align:center;">
          <p style="margin:0 0 4px;font-size:1.25rem;color:#ffffff;font-weight:700;">
            ${params.firstName} ${params.lastName} <span style="font-size:0.85rem;color:#999;font-weight:400;">(Invité #${t.ticketNumber})</span>
          </p>
          <p style="margin:0 0 1.25rem;font-size:0.85rem;color:${t.hasMask ? '#D4AF37' : '#888'};font-weight:500;">
            ${t.hasMask ? '✓ Remise d\'un masque vénitien officiel à l\'accueil' : 'L\'invité apporte son propre masque'}
          </p>

          <!-- QR Code Embed (CID) -->
          <div style="display:inline-block;padding:12px;background:#ffffff;border-radius:10px;border:3px solid #D4AF37;margin:0 auto 10px;">
            <img src="cid:qrcode-cid-${t.ticketNumber}" alt="QR Code Billet #${t.ticketNumber}" width="190" height="190" style="display:block;margin:0 auto;" />
          </div>

          <p style="margin:6px 0 14px;font-family:monospace;font-size:0.85rem;color:#D4AF37;letter-spacing:0.12em;font-weight:700;">
            REF : ${t.qrCode.slice(0, 13).toUpperCase()}
          </p>

          <div>
            <a href="${params.baseUrl}/billet/${t.qrCode}" target="_blank" style="display:inline-block;background:#D4AF37;color:#000000;font-weight:700;font-size:0.85rem;padding:9px 18px;border-radius:6px;text-decoration:none;letter-spacing:0.02em;">
              📲 Ouvrir ce e-billet sur smartphone
            </a>
          </div>
        </div>
      </div>
    `).join('')}
  </div>

  <!-- Avertissement Porte & Scanner -->
  <div style="padding:1.25rem 1.75rem;background:#181205;border-top:1px solid rgba(212,175,55,0.3);text-align:center;">
    <p style="margin:0;font-size:0.82rem;color:#e67e22;line-height:1.5;">
      ⏰ <strong>FERMETURE STRICTE DES PORTES :</strong><br>
      Les billets et les accès ferment 2h après le début de l&apos;événement. Aucun retardataire ne sera admis.<br>
      Chaque QR code est à scan unique et non réutilisable.
    </p>
  </div>

  <!-- Footer -->
  <div style="padding:1.5rem 2rem;text-align:center;background:#0a0a0a;">
    <p style="margin:0;font-size:0.75rem;color:#666;line-height:1.6;">
      Pour toute question, contactez notre équipe sur WhatsApp.<br>
      © THE DISNASTY CIRCLE • ÉLÉGANCE • PASSION • MYSTÈRE
    </p>
  </div>
</div>
</body>
</html>`
}

// POST /api/tickets/send — generate all tickets and send one comprehensive email
export async function POST(req: NextRequest) {
  try {
    const { reservationId, overrides } = await req.json()

    if (!reservationId) {
      return NextResponse.json({ error: 'reservationId requis.' }, { status: 400 })
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        event: true,
        phase: true,
        tickets: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
    }

    if (reservation.status === 'CANCELLED') {
      return NextResponse.json({
        error: 'Cette réservation a été annulée et révoquée. Restaurez-la d\'abord avec le code administrateur avant de pouvoir envoyer des billets.',
      }, { status: 400 })
    }

    const firstName   = overrides?.firstName   ?? reservation.firstName
    const lastName    = overrides?.lastName    ?? reservation.lastName
    const email       = overrides?.email       ?? reservation.email
    const ticketCount = overrides?.ticketCount ?? reservation.ticketCount
    const wantsMask   = overrides?.wantsMask   ?? reservation.wantsMask
    const maskCount   = overrides?.maskCount   ?? (reservation as any).maskCount ?? (wantsMask ? ticketCount : 0)
    const totalAmount = overrides?.totalAmount ?? reservation.totalAmount ?? 0

    // Update reservation status to CONFIRMED
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        ...(overrides ? { firstName, lastName, email, ticketCount, wantsMask, totalAmount } : {}),
        status: 'CONFIRMED',
      },
    })

    // Generate or update tickets: exactly ticketCount tickets
    const ticketsData: { qrCode: string; ticketNumber: number; hasMask: boolean }[] = []
    const isTable = Boolean((reservation as any).isTable || (reservation as any).tableName)
    const tableName = (reservation as any).tableName || (isTable ? 'Table VIP' : null)

    for (let i = 0; i < ticketCount; i++) {
      const existing = reservation.tickets[i]
      const hasMask = i < maskCount
      const ticketNumber = i + 1

      if (existing) {
        await prisma.ticket.update({
          where: { id: existing.id },
          data: {
            ticketNumber,
            hasMask,
            isTableTicket: isTable,
            tableName,
            sentAt: new Date(),
          },
        })
        ticketsData.push({
          qrCode: existing.qrCode,
          ticketNumber,
          hasMask,
        })
      } else {
        const qrCode = uuidv4()
        const newTicket = await prisma.ticket.create({
          data: {
            reservationId: reservation.id,
            qrCode,
            ticketNumber,
            hasMask,
            isTableTicket: isTable,
            tableName,
            sentAt: new Date(),
          },
        })
        ticketsData.push({
          qrCode: newTicket.qrCode,
          ticketNumber: newTicket.ticketNumber,
          hasMask: newTicket.hasMask,
        })
      }
    }

    const phaseName = isTable ? `🍾 ${tableName || 'Table VIP'}` : (reservation.phase?.name ?? 'Standard')
    const eventDate = formatDate(reservation.event.date)
    const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    // Build CID attachments
    const attachments: any[] = []

    // Safely attach logo if present
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    try {
      const fs = await import('fs')
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: 'disnasty-logo',
        })
      }
    } catch (logoErr) {
      console.warn('Could not read logo for email:', logoErr)
    }

    for (let i = 0; i < ticketsData.length; i++) {
      const t = ticketsData[i]
      const qrBuffer = await QRCode.toBuffer(t.qrCode, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      })
      attachments.push({
        filename: `qrcode-${t.ticketNumber}.png`,
        content: qrBuffer,
        cid: `qrcode-cid-${t.ticketNumber}`,
      })
    }

    const html = buildMultiTicketHtml({
      firstName,
      lastName,
      eventTitle:    reservation.event.title,
      eventSubtitle: reservation.event.subtitle,
      eventDate,
      eventLocation: reservation.event.location,
      eventTime:     reservation.event.timeStart,
      dressCode:     reservation.event.dressCode ?? 'Tenue élégante',
      phaseName,
      ticketCount,
      maskCount,
      totalAmount,
      tickets: ticketsData,
      baseUrl,
    })

    const emailSubject = isTable
      ? `🍾 Vos billets officiels pour ${tableName || 'votre Table VIP'} — ${reservation.event.title}`
      : `🎟️ Vos ${ticketCount} billet(s) officiels — ${reservation.event.title} | THE DISNASTY CIRCLE`

    const sendRes = await sendEmail({
      to: email,
      subject: emailSubject,
      html,
      attachments,
    })

    return NextResponse.json({
      success: true,
      ticketCount: ticketsData.length,
      qrCode: ticketsData[0].qrCode,
      ticketUrl: `/billet/${ticketsData[0].qrCode}`,
      email,
      phone: (reservation as any).phone || null,
      isMockEmail: sendRes.isMock ?? false,
      provider: sendRes.provider,
    })
  } catch (err: any) {
    console.error('Send ticket error:', err)
    return NextResponse.json({
      error: 'Erreur lors de l\'envoi du billet: ' + (err?.message || String(err)),
      details: String(err?.stack || err),
    }, { status: 500 })
  }
}
