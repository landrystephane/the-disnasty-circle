import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'THE DYNASTY CIRCLE — Événements Exclusifs & Soirées Prestige',
  description: 'Billetterie officielle des événements THE DYNASTY CIRCLE. Découvrez nos prochaines soirées et réservez vos accès VIP.',
  keywords: 'THE DYNASTY CIRCLE, événements, soirées Paris, billetterie, prestige, gala',
  openGraph: {
    title: 'THE DYNASTY CIRCLE — Événements Exclusifs',
    description: 'Billetterie officielle et programmation des soirées THE DYNASTY CIRCLE.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
