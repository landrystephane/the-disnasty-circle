import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import path from 'path'

// GET ou POST pour déclenchement automatique ou manuel depuis le staff
export async function GET(req: NextRequest) {
  return handleSendReviews(req)
}

export async function POST(req: NextRequest) {
  return handleSendReviews(req)
}

async function handleSendReviews(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    // Trouver toutes les réservations confirmées
    const reservations = await prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED',
        ...(eventId ? { eventId } : {}),
      },
      include: {
        event: { select: { title: true, date: true } },
      },
    })

    if (reservations.length === 0) {
      return NextResponse.json({ count: 0, message: 'Aucune réservation confirmée trouvée.' })
    }

    const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://the-disnasty-circle.vercel.app')
    const reviewUrl = `${baseUrl}/avis`

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

    const uniqueEmails = Array.from(new Set(reservations.map(r => r.email.trim().toLowerCase())))
    let sentCount = 0

    for (const email of uniqueEmails) {
      const userRes = reservations.find(r => r.email.trim().toLowerCase() === email)
      const firstName = userRes?.firstName || 'Invité VIP'
      const eventTitle = userRes?.event?.title || 'notre dernière soirée'

      const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Votre avis compte — THE DISNASTY CIRCLE</title></head>
<body style="margin:0;padding:0;background:#090909;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:620px;margin:0 auto;background:#111111;border:1px solid #2a2a2a;">
  <div style="background:linear-gradient(135deg,#0d0a02 0%,#1f1807 100%);border-bottom:2px solid #D4AF37;padding:2rem 1.5rem;text-align:center;">
    <div style="margin-bottom:12px;">
      <img src="cid:disnasty-logo" alt="THE DISNASTY CIRCLE" width="95" height="95" style="display:block;margin:0 auto;border-radius:10px;border:1px solid rgba(212,175,55,0.4);" />
    </div>
    <p style="margin:0;font-size:0.75rem;letter-spacing:0.25em;text-transform:uppercase;color:#D4AF37;font-weight:700;">THE DISNASTY CIRCLE • AVIS DES MEMBRES</p>
    <h1 style="margin:0.5rem 0 0.25rem;font-size:1.8rem;color:#ffffff;">Votre avis sur le ${eventTitle}</h1>
  </div>
  <div style="padding:2rem 2rem 2.5rem;background:#141414;color:#f5f0e8;font-size:0.95rem;line-height:1.7;">
    <p style="color:#D4AF37;font-weight:600;margin-top:0;">Bonjour ${firstName},</p>
    <p style="color:#e0dacb;">
      Toute l'équipe de <strong>THE DISNASTY CIRCLE</strong> vous remercie chaleureusement pour votre présence parmi nous lors de la soirée <em>${eventTitle}</em> !
    </p>
    <p style="color:#e0dacb;">
      Afin de continuer à sublimer nos prochains événements, votre ressenti nous est particulièrement précieux. Prenez <strong>30 secondes</strong> pour noter votre soirée et nous partager votre expérience :
    </p>

    <div style="text-align:center;margin:2rem 0;">
      <a href="${reviewUrl}" style="background:linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%);color:#000000;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:1rem;display:inline-block;letter-spacing:0.04em;">
        ⭐ Donner mon avis sur la soirée →
      </a>
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
        const res = await sendEmail({
          to: email,
          subject: `⭐ Votre expérience sur ${eventTitle} — THE DISNASTY CIRCLE`,
          html: emailHtml,
          attachments,
        })
        if (res.success) sentCount++
      } catch (err) {
        console.warn(`Review email failed for ${email}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalRecipients: uniqueEmails.length,
      message: `${sentCount} demande(s) d'avis envoyée(s) avec succès !`,
    })
  } catch (err: any) {
    console.error('Review cron error:', err)
    return NextResponse.json({ error: err?.message || 'Erreur interne.' }, { status: 500 })
  }
}
