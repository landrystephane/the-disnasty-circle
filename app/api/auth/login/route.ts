import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
    }

    const user = await prisma.staffUser.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 })
    }

    return NextResponse.json({
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    })
  } catch (err) {
    console.error('Auth error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
