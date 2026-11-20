import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, phaseId, firstName, lastName, email, phone, ticketCount, wantsMask, maskCount, message } = body

    if (!eventId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    // Verify event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event || event.status === 'CLOSED' || event.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cet événement n\'est plus disponible.' }, { status: 400 })
    }

    const count = parseInt(ticketCount) || 1
    const finalMaskCount = typeof maskCount === 'number' ? maskCount : (wantsMask ? count : 0)

    // Get phase price if phase selected
    let totalAmount: number | null = null
    if (phaseId) {
      const phase = await prisma.ticketPhase.findUnique({ where: { id: phaseId } })
      if (phase) {
        totalAmount = phase.price * count + (finalMaskCount * 10)
        // Increment sold count
        await prisma.ticketPhase.update({
          where: { id: phaseId },
          data: { soldCount: { increment: count } },
        })
      }
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        eventId,
        phaseId: phaseId || null,
        firstName,
        lastName,
        email,
        phone: phone || null,
        ticketCount: count,
        wantsMask: finalMaskCount > 0,
        maskCount: finalMaskCount,
        message: message || null,
        status: 'PENDING',
        totalAmount,
      },
    })

    // Notification email instantanée à l'équipe organisatrice
    try {
      const user = process.env.SMTP_USER || process.env.GMAIL_USER
      const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
      const alertRecipient = process.env.STAFF_ALERT_EMAIL || user

      if (user && pass && !pass.includes('placeholder') && alertRecipient) {
        const nodemailer = (await import('nodemailer')).default
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '465', 10),
          secure: true,
          auth: { user, pass },
        })

        transporter.sendMail({
          from: `"THE DYNASTY CIRCLE — Système" <${user}>`,
          to: alertRecipient,
          subject: `✨ Nouvelle réservation : ${firstName} ${lastName} (${count} place(s))`,
          html: `
            <div style="font-family:sans-serif;background:#0d0d0d;color:#f5f0e8;padding:24px;border-radius:8px;border:1px solid #D4AF37;">
              <h2 style="color:#D4AF37;margin-top:0;">🎉 Nouvelle Réservation Reçue !</h2>
              <p>Une personne vient de réserver sur le site <strong>THE DYNASTY CIRCLE</strong> :</p>
              <ul style="line-height:1.8;">
                <li><strong>Client :</strong> ${firstName} ${lastName}</li>
                <li><strong>Email :</strong> ${email}</li>
                <li><strong>Téléphone :</strong> ${phone || 'Non renseigné'}</li>
                <li><strong>Places :</strong> ${count} billet(s)</li>
                <li><strong>Total :</strong> ${totalAmount ? `${totalAmount}€` : 'Non spécifié'}</li>
                <li><strong>Événement :</strong> ${event.title}</li>
              </ul>
              <p style="margin-top:20px;">
                <a href="${process.env.NEXTAUTH_URL || 'https://the-disnasty-circle.vercel.app'}/staff/reservations" style="background:#D4AF37;color:#000;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">
                  Voir dans l'espace Staff →
                </a>
              </p>
            </div>
          `,
        }).catch(mailErr => console.warn('Staff notification mail skipped:', mailErr))
      }
    } catch (notifErr) {
      console.warn('Notification error (ignored):', notifErr)
    }

    return NextResponse.json({ success: true, reservationId: reservation.id })
  } catch (err: any) {
    console.error('Reservation error:', err)
    return NextResponse.json({ error: err?.message || 'Erreur interne.', details: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    const status  = searchParams.get('status')

    const reservations = await prisma.reservation.findMany({
      where: {
        ...(eventId ? { eventId } : {}),
        ...(status  ? { status }  : {}),
      },
      include: {
        event:  { select: { title: true, slug: true, whatsappNumber: true } },
        phase:  { select: { name: true, price: true } },
        tickets: { select: { id: true, qrCode: true, isUsed: true, sentAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reservations)
  } catch (err) {
    console.error('Get reservations error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, notes, totalAmount, wantsMask, ticketCount } = body
    if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

    const current = await prisma.reservation.findUnique({
      where: { id },
      select: { status: true, phaseId: true, ticketCount: true },
    })

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(totalAmount !== undefined ? { totalAmount } : {}),
        ...(wantsMask !== undefined ? { wantsMask } : {}),
        ...(ticketCount !== undefined ? { ticketCount } : {}),
      },
    })

    // Décompter automatiquement les billets si réservation annulée
    if (status === 'CANCELLED' && current?.status !== 'CANCELLED' && current?.phaseId) {
      await prisma.ticketPhase.update({
        where: { id: current.phaseId },
        data: { soldCount: { decrement: current.ticketCount } },
      }).catch(() => {})
    }

    // Ré-incrémenter si la réservation est restaurée
    if (status === 'CONFIRMED' && current?.status === 'CANCELLED' && current?.phaseId) {
      await prisma.ticketPhase.update({
        where: { id: current.phaseId },
        data: { soldCount: { increment: current.ticketCount } },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, reservation: updated })
  } catch (err) {
    console.error('Update reservation error:', err)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
  }
}
