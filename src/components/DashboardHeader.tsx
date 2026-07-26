'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react'
import { ExternalLink, Home, LogOut, Menu } from 'lucide-react'
import DashboardSideDrawer, { type DashboardPage } from './DashboardSideDrawer'

interface DashboardHeaderProps {
  session: any
  title?: string
  subtitle?: string
  showLandingPageButton?: boolean
  currentPage?: DashboardPage
}

const ICON_PROPS = {
  size: 18,
  strokeWidth: 1.75,
} as const

const headerBtnStyle: CSSProperties = {
  width: '36px',
  height: '36px',
  border: '2px solid rgba(255, 255, 255, 0.5)',
  color: 'white',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  padding: 0,
}

function HeaderIconButton({
  onClick,
  title,
  ariaLabel,
  children,
}: {
  onClick?: () => void
  title: string
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="btn btn-sm d-flex align-items-center justify-content-center"
      style={headerBtnStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
        e.currentTarget.style.borderColor = 'white'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
      }}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

export default function DashboardHeader({
  session,
  title,
  subtitle,
  showLandingPageButton = true,
  currentPage = 'dashboard',
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoVisible, setLogoVisible] = useState(true)
  const [logoSrc, setLogoSrc] = useState('/photos/hostly-logo.png')

  useEffect(() => {
    const checkLogo = async () => {
      try {
        const response = await fetch('/photos/hostly-logo.png')
        if (!response.ok) {
          setLogoSrc('/hostly-logo.png')
          const fallbackResponse = await fetch('/hostly-logo.png')
          if (!fallbackResponse.ok) {
            setLogoVisible(false)
          }
        }
      } catch {
        setLogoSrc('/hostly-logo.png')
        try {
          const fallbackResponse = await fetch('/hostly-logo.png')
          if (!fallbackResponse.ok) {
            setLogoVisible(false)
          }
        } catch {
          setLogoVisible(false)
        }
      }
    }
    checkLogo()
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut({ redirect: false })
    window.location.href = '/'
  }, [])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const displayTitle = title || session?.user?.displayName || 'Hostly'

  return (
    <>
      <style jsx global>{`
        .dashboard-header-card {
          padding: 0.75rem !important;
        }

        .dashboard-header-logo {
          height: 40px !important;
          width: auto !important;
          display: block !important;
        }

        .dashboard-header-title {
          font-size: 1.25rem !important;
          line-height: 1.3 !important;
        }

        @media (min-width: 768px) {
          .dashboard-header-card {
            padding: 1.5rem !important;
          }

          .dashboard-header-logo {
            height: 48px !important;
          }

          .dashboard-header-title {
            font-size: 1.75rem !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>

      <div
        className="dashboard-header-card d-flex align-items-center justify-content-between gap-2 gap-md-3"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          borderRadius: '12px',
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
          position: 'relative',
        }}
      >
        {/* Right: Logo */}
        <div className="d-flex align-items-center gap-2 gap-md-3">
          {logoVisible && (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              }}
            >
              <img
                src={logoSrc}
                alt="Hostly"
                className="dashboard-header-logo"
                style={{
                  objectFit: 'contain',
                  height: '40px',
                  maxHeight: '48px',
                  width: 'auto',
                  display: 'block',
                }}
                onError={() => setLogoVisible(false)}
              />
            </div>
          )}
        </div>

        {/* Center: Title */}
        <div
          className="position-absolute"
          style={{ left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}
        >
          <h1
            className="dashboard-header-title fw-bold mb-0"
            style={{
              color: 'white',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            {displayTitle}
          </h1>
          {session?.user?.firstName && session?.user?.lastName && (
            <p
              className="small mb-0 d-none d-md-block"
              style={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: '500' }}
            >
              שלום {session.user.firstName} {session.user.lastName}
            </p>
          )}
          {subtitle && (
            <p className="small mb-0 d-none d-md-block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Left: Desktop Buttons + Menu */}
        <div className="d-flex align-items-center gap-2">
          <div className="d-none d-md-flex align-items-center gap-2">
            {currentPage !== 'dashboard' && (
              <Link
                href="/dashboard"
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={headerBtnStyle}
                title="דף הבית"
                aria-label="דף הבית"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
                  e.currentTarget.style.borderColor = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                }}
              >
                <Home {...ICON_PROPS} />
              </Link>
            )}

            {showLandingPageButton && session?.user?.landingPageUrl && (
              <HeaderIconButton
                title="צפה באתר"
                ariaLabel="צפה באתר"
                onClick={() => window.open(session.user.landingPageUrl, '_blank')}
              >
                <ExternalLink {...ICON_PROPS} />
              </HeaderIconButton>
            )}

            <HeaderIconButton title="התנתק" ariaLabel="התנתק" onClick={handleLogout}>
              <LogOut {...ICON_PROPS} />
            </HeaderIconButton>
          </div>

          <HeaderIconButton
            title="תפריט"
            ariaLabel="תפריט"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Menu {...ICON_PROPS} />
          </HeaderIconButton>
        </div>
      </div>

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
