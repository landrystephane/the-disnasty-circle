const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

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

  // Create or update the Bal Masqué event
  const balMasqueData = {
    slug:          'bal-masque',
    title:         'Bal Masqué',
    subtitle:      'ÉLÉGANCE • PASSION • MYSTÈRE',
    date:          new Date('2026-12-19T20:00:00+01:00'),
    location:      "20, rue de l'Avenir, 93800 Épinay-sur-Seine",
    timeStart:     '20h',
    description:   "Une soirée inoubliable vous attend en Île-de-France ! Venez vêtus de votre plus belle tenue et parés de votre plus beau masque pour laisser la magie opérer. Attention : Bal masqué, le port du masque et une tenue élégante sont strictement obligatoires dès l'entrée. Deux boissons sont offertes avec votre billet, et un bar complet est mis à votre entière disposition tout au long de la nuit pour toutes vos boissons supplémentaires.",
    dressCode:     'Tenue élégante & Masque obligatoires',
    posterUrl:     '/bal-masque-flyer.jpg',
    includes:      JSON.stringify([
      '2 boissons offertes',
      'Bar à disposition toute la soirée (boissons supplémentaires)',
      'Petite restauration',
    ]),
    status:        'ACTIVE',
    whatsappNumber: '+33753304120',
  }

  const event = await prisma.event.upsert({
    where:  { slug: 'bal-masque' },
    update: {
      title:       balMasqueData.title,
      subtitle:    balMasqueData.subtitle,
      date:        balMasqueData.date,
      location:    balMasqueData.location,
      timeStart:   balMasqueData.timeStart,
      description: balMasqueData.description,
      dressCode:   balMasqueData.dressCode,
      posterUrl:   balMasqueData.posterUrl,
      includes:    balMasqueData.includes,
    },
    create: balMasqueData,
  })
  console.log(`✅ Soirée créée/mise à jour: ${event.title} (${event.location})`)

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
  console.log(`📍 Lieu:           ${balMasqueData.location}`)
  console.log(`👔 Dress Code:     ${balMasqueData.dressCode}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((err) => {
    console.error('❌ Erreur seed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
