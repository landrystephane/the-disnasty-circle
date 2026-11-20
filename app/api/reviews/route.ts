import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/reviews — récupérer les avis vérifiés
export async function GET() {
  try {
    const reviews = await (prisma as any).review.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json(reviews)
  } catch (err) {
    console.error('Get reviews error:', err)
    return NextResponse.json([])
  }
}

// POST /api/reviews — soumettre un avis d'invité
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authorName, rating, comment } = body

    if (!authorName?.trim() || !comment?.trim()) {
      return NextResponse.json({ error: 'Votre nom et votre commentaire sont requis.' }, { status: 400 })
    }

    const numericRating = Math.max(1, Math.min(5, parseInt(rating) || 5))

    const review = await (prisma as any).review.create({
      data: {
        authorName: authorName.trim(),
        rating: numericRating,
        comment: comment.trim(),
        approved: true, // visible par défaut
      },
    })

    return NextResponse.json({ success: true, review })
  } catch (err: any) {
    console.error('Submit review error:', err)
    return NextResponse.json({ error: err?.message || 'Erreur lors de l\'enregistrement de votre avis.' }, { status: 500 })
  }
}
