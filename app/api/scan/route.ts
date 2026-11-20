import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/scan — récupérer les statistiques d'affluence en direct
export async function GET() {
  try {
    const [total, present] = await Promise.all([
      prisma.ticket.count({
        where: {
          reservation: { status: { not: 'CANCELLED' } },
        },
      }),
      prisma.ticket.count({
        where: {
          reservation: { status: { not: 'CANCELLED' } },
          isUsed: true,
        },
      }),
    ])

    return NextResponse.json({
      present,
      remaining: Math.max(0, total - present),
      total,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    })
  } catch (err) {
    console.error('Scan stats error:', err)
    return NextResponse.json({ present: 0, remaining: 0, total: 0, rate: 0 }, { status: 500 })
  }
}

// POST /api/scan — scanner un code QR à l'accueil
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { qrCode, operatorName, forceAllow } = body

    if (!qrCode || typeof qrCode !== 'string') {
      return NextResponse.json({ valid: false, reason: 'QR code manquant.' }, { status: 400 })
    }

    let cleanCode = qrCode.trim()
    if (cleanCode.includes('/billet/')) {
      cleanCode = cleanCode.split('/billet/')[1].split('?')[0].split('#')[0].trim()
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrCode: cleanCode },
      include: {
        reservation: {
          include: {
            event: { select: { id: true, title: true, date: true, timeStart: true, location: true } },
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

    // Règle de révocation stricte : Billet rattaché à une réservation annulée
    if (ticket.reservation.status === 'CANCELLED') {
      return NextResponse.json({
        valid: false,
        reason: 'RÉSERVATION ANNULÉE : Ce billet a été révoqué par l\'organisation. Entrée strictement refusée !',
        status: 'CANCELLED',
        holder: `${ticket.reservation.firstName} ${ticket.reservation.lastName}`,
        event:  ticket.reservation.event.title,
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

    // Validité temporelle : Autorise l'accès toute la nuit (jusqu'à 8h après le début de la soirée, ex: 04h-06h du matin)
    const eventDate = new Date(ticket.reservation.event.date)
    const cutoffTime = new Date(eventDate.getTime() + 8 * 60 * 60 * 1000) // 8 heures de validité
    const now = new Date()

    if (!forceAllow && now > cutoffTime) {
      return NextResponse.json({
        valid: false,
        reason: `Billet expiré. L'accès pour cette soirée était autorisé jusqu'à ${cutoffTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
        status: 'EXPIRED',
        holder: `${ticket.reservation.firstName} ${ticket.reservation.lastName}`,
        event:  ticket.reservation.event.title,
      })
    }

    // Validation et enregistrement de l'entrée
    await prisma.ticket.update({
      where: { id: ticket.id },
      data:  {
        isUsed: true,
        usedAt: new Date(),
        usedBy: operatorName ?? 'Accueil Staff',
      },
    })

    // Statistiques en direct mises à jour après ce scan
    const [total, present] = await Promise.all([
      prisma.ticket.count({
        where: {
          reservation: { status: { not: 'CANCELLED' } },
        },
      }),
      prisma.ticket.count({
        where: {
          reservation: { status: { not: 'CANCELLED' } },
          isUsed: true,
        },
      }),
    ])

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
      stats: {
        present,
        remaining: Math.max(0, total - present),
        total,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      },
    })
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json({ valid: false, reason: 'Erreur interne.' }, { status: 500 })
  }
}
