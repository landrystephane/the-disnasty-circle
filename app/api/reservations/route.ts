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
    return NextResponse.json({ success: true, reservation: updated })
  } catch (err) {
    console.error('Update reservation error:', err)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
  }
}
