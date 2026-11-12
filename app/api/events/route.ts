import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          ticketPhases: { orderBy: { order: 'asc' } },
          _count: { select: { reservations: true } },
        },
      })
      if (!event) return NextResponse.json({ error: 'Soirée introuvable.' }, { status: 404 })
      return NextResponse.json(event)
    }

    const events = await prisma.event.findMany({
      include: {
        ticketPhases: { orderBy: { order: 'asc' } },
        _count: {
          select: {
            reservations: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(events)
  } catch (err) {
    console.error('Get events error:', err)
    return NextResponse.json({ error: 'Erreur récupération événements.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title,
      subtitle,
      date,
      timeStart,
      location,
      description,
      posterUrl,
      dressCode,
      includes,
      phases,
      ticketPrice,
      phaseName,
      whatsappNumber,
    } = body

    if (!title || !date || !location) {
      return NextResponse.json({ error: 'Titre, date et lieu sont obligatoires.' }, { status: 400 })
    }

    // Generate unique slug
    let baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!baseSlug) baseSlug = 'soiree-' + Date.now()

    let slug = baseSlug
    let counter = 1
    while (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`
    }

    // Build phases list
    const phasesData = Array.isArray(phases) && phases.length > 0
      ? phases.map((p: any, idx: number) => ({
          name: p.name || 'Entrée standard',
          price: parseFloat(p.price) || 40,
          endDate: p.endDate ? new Date(p.endDate) : null,
          order: idx,
          isActive: true,
        }))
      : [
          {
            name: phaseName || 'Entrée standard',
            price: parseFloat(ticketPrice) || 40,
            order: 0,
            isActive: true,
          },
        ]

    const event = await prisma.event.create({
      data: {
        slug,
        title,
        subtitle: subtitle || null,
        date: new Date(date),
        timeStart: timeStart || '20h',
        location,
        description: description || null,
        posterUrl: posterUrl || null,
        dressCode: dressCode || 'Tenue élégante exigée',
        includes: includes
          ? (typeof includes === 'string' ? JSON.stringify(includes.split('\n').filter(Boolean)) : JSON.stringify(includes))
          : null,
        whatsappNumber: whatsappNumber || process.env.DEFAULT_WHATSAPP || '+33753304120',
        status: 'ACTIVE',
        ticketPhases: {
          create: phasesData,
        },
      },
    })

    return NextResponse.json({ success: true, event })
  } catch (err) {
    console.error('Create event error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création de la soirée.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      status,
      whatsappNumber,
      title,
      subtitle,
      date,
      timeStart,
      location,
      description,
      posterUrl,
      dressCode,
      includes,
      phases,
    } = body

    if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(whatsappNumber !== undefined ? { whatsappNumber } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(subtitle !== undefined ? { subtitle } : {}),
        ...(date ? { date: new Date(date) } : {}),
        ...(timeStart !== undefined ? { timeStart } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(posterUrl !== undefined ? { posterUrl } : {}),
        ...(dressCode !== undefined ? { dressCode } : {}),
        ...(includes !== undefined
          ? {
              includes:
                typeof includes === 'string'
                  ? JSON.stringify(includes.split('\n').filter(Boolean))
                  : JSON.stringify(includes),
            }
          : {}),
      },
    })

    // If phases array is provided, update phases
    if (Array.isArray(phases) && phases.length > 0) {
      await prisma.ticketPhase.deleteMany({ where: { eventId: id } })
      for (let i = 0; i < phases.length; i++) {
        const p = phases[i]
        await prisma.ticketPhase.create({
          data: {
            eventId: id,
            name: p.name || 'Entrée standard',
            price: parseFloat(p.price) || 40,
            endDate: p.endDate ? new Date(p.endDate) : null,
            order: i,
            isActive: true,
          },
        })
      }
    }

    return NextResponse.json({ success: true, event: updated })
  } catch (err) {
    console.error('Update event error:', err)
    return NextResponse.json({ error: 'Erreur modification événement.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

    // Clean cascade delete
    await prisma.ticket.deleteMany({
      where: { reservation: { eventId: id } },
    })
    await prisma.reservation.deleteMany({
      where: { eventId: id },
    })
    await prisma.ticketPhase.deleteMany({
      where: { eventId: id },
    })
    await prisma.expense.deleteMany({
      where: { eventId: id },
    })
    await prisma.event.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete event error:', err)
    return NextResponse.json({ error: 'Erreur lors de la suppression de la soirée.' }, { status: 500 })
  }
}
