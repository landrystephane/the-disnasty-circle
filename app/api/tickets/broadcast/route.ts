import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const { subject, message, eventId } = await req.json()

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Le sujet et le message sont requis.' }, { status: 400 })
    }

    // Trouver toutes les réservations confirmées
    const reservations = await prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED',
        ...(eventId ? { eventId } : {}),
      },
      include: {
        event: { select: { title: true, date: true, location: true } },
      },
    })

    if (reservations.length === 0) {
      return NextResponse.json({ count: 0, message: 'Aucune réservation confirmée trouvée.' })
    }

    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const attachments: any[] = []
    try {
      const fs = await import('fs')
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: 'disnasty-logo',
        })
      }
    } catch {}

    let sentSuccess = 0
    let failedCount = 0

    // Dédupliquer les adresses emails pour ne pas spammer quelqu'un qui a plusieurs réservations
    const uniqueEmails = Array.from(new Set(reservations.map(r => r.email.trim().toLowerCase())))

    for (const email of uniqueEmails) {
      const userRes = reservations.find(r => r.email.trim().toLowerCase() === email)
      const firstName = userRes?.firstName || 'Invité VIP'
      const eventTitle = userRes?.event?.title || 'THE DISNASTY CIRCLE'

      const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#090909;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:620px;margin:0 auto;background:#111111;border:1px solid #2a2a2a;">
  <div style="background:linear-gradient(135deg,#0d0a02 0%,#1f1807 100%);border-bottom:2px solid #D4AF37;padding:2rem 1.5rem;text-align:center;">
    <div style="margin-bottom:12px;">
      <img src="cid:disnasty-logo" alt="THE DISNASTY CIRCLE" width="95" height="95" style="display:block;margin:0 auto;border-radius:10px;border:1px solid rgba(212,175,55,0.4);" />
    </div>
    <p style="margin:0;font-size:0.75rem;letter-spacing:0.25em;text-transform:uppercase;color:#D4AF37;font-weight:700;">THE DISNASTY CIRCLE • ANNONCE OFFICIELLE</p>
    <h1 style="margin:0.5rem 0 0.25rem;font-size:1.8rem;color:#ffffff;letter-spacing:0.03em;">${eventTitle}</h1>
  </div>
  <div style="padding:2rem 2rem 2.5rem;background:#141414;color:#f5f0e8;font-size:0.95rem;line-height:1.7;">
    <p style="color:#D4AF37;font-weight:600;margin-top:0;">Bonjour ${firstName},</p>
    <div style="white-space:pre-line;color:#e0dacb;margin:1.25rem 0;">
      ${message}
    </div>
    <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #282828;color:#9E8E6E;font-size:0.85rem;">
      <p style="margin:0;">L'équipe <strong>THE DISNASTY CIRCLE</strong></p>
      <p style="margin:0.3rem 0 0;font-size:0.75rem;color:#7a6d54;">Prestige • Nightlife • Événements d'Exception</p>
    </div>
  </div>
</div>
</body>
</html>`

      try {
        const sendRes = await sendEmail({
          to: email,
          subject,
          html: emailHtml,
          attachments,
        })
        if (sendRes.success) sentSuccess++
        else failedCount++
      } catch (sendErr) {
        console.error(`Failed to broadcast to ${email}:`, sendErr)
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: sentSuccess,
      failedCount,
      totalRecipients: uniqueEmails.length,
    })
  } catch (err: any) {
    console.error('Broadcast error:', err)
    return NextResponse.json({ error: err?.message || 'Erreur interne.' }, { status: 500 })
  }
}
