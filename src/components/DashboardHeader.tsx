'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useCallback, type ReactNode } from 'react'
import { ExternalLink, Home, LogOut, Menu } from 'lucide-react'
import DashboardSideDrawer, { type DashboardPage } from './DashboardSideDrawer'

interface DashboardHeaderProps {
  session: any
  title?: string
  subtitle?: string
  showLandingPageButton?: boolean
  currentPage?: DashboardPage
}

const ICON_PROPS = { size: 18, strokeWidth: 1.75 } as const
const HAMBURGER_ICON_PROPS = { size: 22, strokeWidth: 1.5 } as const

function TopbarBtn({
  onClick,
  title,
  ariaLabel,
  children,
  as: Tag = 'button',
  href,
  className,
}: {
  onClick?: () => void
  title: string
  ariaLabel: string
  children: ReactNode
  as?: 'button' | 'a'
  href?: string
  className?: string
}) {
  const cls = `hostly-topbar-btn${className ? ` ${className}` : ''}`
  if (Tag === 'a' && href) {
    return (
      <Link href={href} className={cls} title={title} aria-label={ariaLabel}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick} title={title} aria-label={ariaLabel}>
      {children}
    </button>
  )
}

export default function DashboardHeader({
  session,
  showLandingPageButton = true,
  currentPage = 'dashboard',
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    await signOut({ redirect: false })
    window.location.href = '/'
  }, [])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const propertyName = session?.user?.displayName?.trim() || 'Hostly'

  return (
    <>
      <header className="hostly-topbar" dir="rtl">
        {/* Hamburger — hidden on desktop where sidebar is always visible */}
        <TopbarBtn
          title="תפריט"
          ariaLabel="תפריט"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="hostly-topbar-hamburger"
        >
          <Menu {...HAMBURGER_ICON_PROPS} />
        </TopbarBtn>

        {/* Property name — center */}
        <span className="hostly-topbar-property">{propertyName}</span>

        {/* Action buttons — hidden on mobile (available inside the drawer) */}
        <div className="hostly-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TopbarBtn title="דף הבית" ariaLabel="דף הבית" as="a" href="/dashboard">
            <Home {...ICON_PROPS} />
          </TopbarBtn>

          {showLandingPageButton && session?.user?.landingPageUrl && (
            <TopbarBtn
              title="צפה באתר"
              ariaLabel="צפה באתר"
              onClick={() => window.open(session.user.landingPageUrl, '_blank')}
            >
              <ExternalLink {...ICON_PROPS} />
            </TopbarBtn>
          )}

          <TopbarBtn title="התנתק" ariaLabel="התנתק" onClick={handleLogout}>
            <LogOut {...ICON_PROPS} />
          </TopbarBtn>
        </div>
      </header>

      {/* Mobile drawer */}
      <DashboardSideDrawer
        open={menuOpen}
        onClose={closeMenu}
        session={session}
        currentPage={currentPage}
        showLandingPageButton={showLandingPageButton}
        onLogout={handleLogout}
      />
    </>
  )
}
