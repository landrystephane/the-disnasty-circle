import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    let expenses: any[] = []
    let donations: any[] = []

    try {
      expenses = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Expense ORDER BY date DESC`)
    } catch {
      expenses = []
    }

    try {
      donations = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Donation ORDER BY date DESC`)
    } catch {
      donations = []
    }

    const confirmedReservations = await prisma.reservation.findMany({
      where: { status: 'CONFIRMED' },
      select: { totalAmount: true, ticketCount: true, wantsMask: true },
    })

    const ticketRevenue = confirmedReservations.reduce((sum, r) => sum + (r.totalAmount ?? 0), 0)
    const totalDonations = donations.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0)
    const totalExpenses  = expenses.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0)
    const totalGrossRevenue = ticketRevenue + totalDonations
    const netProfit = totalGrossRevenue - totalExpenses

    return NextResponse.json({
      expenses,
      donations,
      summary: {
        ticketRevenue,
        totalDonations,
        totalExpenses,
        totalGrossRevenue,
        netProfit,
        confirmedOrdersCount: confirmedReservations.length,
      },
    })
  } catch (err) {
    console.error('Finances GET error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...data } = body

    if (action === 'ADD_EXPENSE') {
      const { category, description, amount, date, eventId } = data
      if (!category || !description || !amount) {
        return NextResponse.json({ error: 'Catégorie, description et montant requis.' }, { status: 400 })
      }
      const id = 'exp_' + Date.now() + Math.random().toString(36).substring(2, 7)
      const numAmount = parseFloat(amount)
      const dateVal = date ? new Date(date).toISOString() : new Date().toISOString()
      const nowVal = new Date().toISOString()

      await prisma.$executeRawUnsafe(
        `INSERT INTO Expense (id, category, description, amount, date, eventId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id, category, description, numAmount, dateVal, eventId || null, nowVal
      )
      return NextResponse.json({ success: true, expenseId: id })
    }

    if (action === 'ADD_DONATION') {
      const { donorName, amount, type, notes, date } = data
      if (!donorName || !amount) {
        return NextResponse.json({ error: 'Nom du donateur et montant requis.' }, { status: 400 })
      }
      const id = 'don_' + Date.now() + Math.random().toString(36).substring(2, 7)
      const numAmount = parseFloat(amount)
      const dateVal = date ? new Date(date).toISOString() : new Date().toISOString()
      const nowVal = new Date().toISOString()

      await prisma.$executeRawUnsafe(
        `INSERT INTO Donation (id, donorName, amount, type, notes, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id, donorName, numAmount, type || 'DON', notes || null, dateVal, nowVal
      )
      return NextResponse.json({ success: true, donationId: id })
    }

    return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 })
  } catch (err) {
    console.error('Finances POST error:', err)
    return NextResponse.json({ error: 'Erreur enregistrement financier.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const id   = searchParams.get('id')

    if (!id || !type) {
      return NextResponse.json({ error: 'id et type requis.' }, { status: 400 })
    }

    if (type === 'expense') {
      await prisma.$executeRawUnsafe(`DELETE FROM Expense WHERE id = ?`, id)
      return NextResponse.json({ success: true })
    }

    if (type === 'donation') {
      await prisma.$executeRawUnsafe(`DELETE FROM Donation WHERE id = ?`, id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Type invalide.' }, { status: 400 })
  } catch (err) {
    console.error('Finances DELETE error:', err)
    return NextResponse.json({ error: 'Erreur suppression.' }, { status: 500 })
  }
}
