'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import styles from './staff.module.css'

const navItems = [
  { href: '/staff/dashboard',     icon: '📊', label: 'Tableau de bord' },
  { href: '/staff/reservations',  icon: '🎫', label: 'Réservations' },
  { href: '/staff/scanner',       icon: '🔍', label: 'Scanner QR' },
  { href: '/staff/soirees',       icon: '🎉', label: 'Soirées' },
  { href: '/staff/comptabilite',  icon: '💰', label: 'Comptabilité' },
]

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const isLoginPage = pathname === '/staff/login'

  useEffect(() => {
    if (isLoginPage) return
    const session = localStorage.getItem('staff_session')
    if (!session) {
      router.push('/staff/login')
    }
  }, [router, isLoginPage])

  if (isLoginPage) {
    return <>{children}</>
  }

  function handleLogout() {
    localStorage.removeItem('staff_session')
    router.push('/staff/login')
  }

  return (
    <div className={styles.shell}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <img src="/logo.png" alt="THE DISNASTY CIRCLE" style={{ height: '48px', width: 'auto', borderRadius: '4px' }} />
          <div>
            <p className={styles.logoName}>THE DISNASTY</p>
            <p className={styles.logoCircle}>CIRCLE</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname.startsWith(item.href) ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link href="/" target="_blank" className={styles.navItem} style={{ gap: '0.6rem' }}>
            <span>🌐</span>
            <span>Voir le site</span>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <span>🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
