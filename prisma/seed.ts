import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding THE DISNASTY CIRCLE database...')

  // Create admin user
  const adminHash = await bcrypt.hash('DisnastyAdmin2026!', 12)
  const admin = await prisma.staffUser.upsert({
    where:  { email: 'admin@disnastycircle.com' },
    update: {},
    create: {
      email:        'admin@disnastycircle.com',
      passwordHash: adminHash,
      name:         'Admin TDC',
      role:         'ADMIN',
    },
  })
  console.log(`✅ Admin créé: ${admin.email}`)

  // Create the Bal Masqué event
  const event = await prisma.event.upsert({
    where:  { slug: 'bal-masque' },
    update: {},
    create: {
      slug:          'bal-masque',
      title:         'Bal Masqué',
      subtitle:      'ÉLÉGANCE • PASSION • MYSTÈRE',
      date:          new Date('2026-12-19T20:00:00+01:00'),
      location:      'Paris, Île-de-France',
      timeStart:     '20h',
      description:   'Une soirée inoubliable vous attend à Paris ! Venez vêtu de votre plus belle tenue et laissez la magie opérer. On fait ton plus beau masque, et laisse la magie opérer...',
      dressCode:     'Tenue élégante exigée',
      includes:      JSON.stringify(['Boisson offerte', 'Petite restauration']),
      status:        'ACTIVE',
      whatsappNumber: '+33753304120',
    },
  })
  console.log(`✅ Soirée créée: ${event.title}`)

  // Create single ticket phase (40€)
  await prisma.ticketPhase.upsert({
    where:  { id: 'bal-masque-phase-1' },
    update: {},
    create: {
      id:      'bal-masque-phase-1',
      eventId: event.id,
      name:    'Entrée standard',
      price:   40,
      order:   0,
      isActive: true,
    },
  })
  console.log('✅ Phase de billet créée: 40€')

  console.log('\n🎭 Base de données initialisée avec succès !')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📧 Admin email:    admin@disnastycircle.com')
  console.log('🔑 Admin password: DisnastyAdmin2026!')
  console.log('🌐 Page soirée:    /soirees/bal-masque')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
