import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/scan — scan a QR code at the entrance
export async function POST(req: NextRequest) {
  try {
    const { qrCode, operatorName } = await req.json()

    if (!qrCode) {
      return NextResponse.json({ valid: false, reason: 'QR code manquant.' }, { status: 400 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        reservation: {
          include: {
            event: { select: { title: true, date: true, timeStart: true, location: true } },
            phase: { select: { name: true } },
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({
        valid: false,
        reason: 'QR code introuvable. Ce billet n\'existe pas dans le système.',
        status: 'INVALID',
      })
    }

    if (ticket.isUsed) {
      return NextResponse.json({
        valid: false,
        reason: `Ce billet a déjà été validé à l'entrée le ${new Date(ticket.usedAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
        status: 'ALREADY_USED',
        usedAt: ticket.usedAt,
        holder: `${ticket.reservation.firstName} ${ticket.reservation.lastName}`,
        event:  ticket.reservation.event.title,
      })
    }

    // Règle stricte anti-fraude : Billet valable jusqu'à 2h après le début de la soirée
    const { forceAllow } = await req.json().catch(() => ({}))
    const eventDate = new Date(ticket.reservation.event.date)
    const cutoffTime = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000) // 2 heures après
    const now = new Date()

    if (!forceAllow && now > cutoffTime) {
      return NextResponse.json({
        valid: false,
        reason: `Billet expiré. L'accès était autorisé jusqu'à ${cutoffTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (2h après le début de la soirée).`,
        status: 'EXPIRED',
        holder: `${ticket.reservation.firstName} ${ticket.reservation.lastName}`,
        event:  ticket.reservation.event.title,
      })
    }

    // Mark as used
    await prisma.ticket.update({
      where: { qrCode },
      data:  {
        isUsed: true,
        usedAt: new Date(),
        usedBy: operatorName ?? 'Accueil Staff',
      },
    })

    const hasMask = Boolean((ticket as any).hasMask ?? ticket.reservation.wantsMask)
    const ticketNumber = (ticket as any).ticketNumber ?? 1
    const totalTickets = ticket.reservation.ticketCount

    return NextResponse.json({
      valid:     true,
      status:    'VALID',
      holder:    `${ticket.reservation.firstName} ${ticket.reservation.lastName}`,
      event:     ticket.reservation.event.title,
      phase:     ticket.reservation.phase?.name ?? 'Standard',
      ticketNumber,
      totalTickets,
      hasMask,
      maskInstruction: hasMask
        ? '🎭 MASQUE INCLUS : Remettre 1 masque à l\'invité !'
        : '❌ SANS MASQUE (L\'invité apporte son propre masque)',
    })
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json({ valid: false, reason: 'Erreur interne.' }, { status: 500 })
  }
}
