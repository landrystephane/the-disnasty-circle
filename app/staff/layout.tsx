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
          <img src="/logo.png" alt="THE DYNASTY CIRCLE" style={{ height: '48px', width: 'auto', borderRadius: '4px' }} />
          <div>
            <p className={styles.logoName}>THE DYNASTY</p>
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

      {/* MOBILE TOP HEADER */}
      <header className={styles.mobileTopBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/logo.png" alt="TDC" style={{ height: '32px', width: 'auto', borderRadius: '4px' }} />
          <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em' }}>
            DYNASTY CIRCLE
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <span>🚪</span>
          <span>Sortir</span>
        </button>
      </header>

      {/* MAIN */}
      <main className={styles.main}>
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className={styles.mobileNav}>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.mobileNavItem} ${pathname.startsWith(item.href) ? styles.mobileNavItemActive : ''}`}
          >
            <span className={styles.mobileNavIcon}>{item.icon}</span>
            <span className={styles.mobileNavLabel}>
              {item.label === 'Tableau de bord' ? 'Bord' : item.label === 'Comptabilité' ? 'Compta' : item.label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
