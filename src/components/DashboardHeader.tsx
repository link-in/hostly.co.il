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
  title: _title,
  subtitle: _subtitle,
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

  // Business / property display name under the logo (e.g. "נוף הרים בדפנה")
  const underLogoLabel = session?.user?.displayName?.trim() || 'Hostly'

  return (
    <>
      <style jsx global>{`
        .dashboard-header-card {
          padding: 0.85rem 0.85rem !important;
        }

        .dashboard-header-logo {
          height: 36px !important;
          width: auto !important;
          display: block !important;
        }

        .dashboard-header-title {
          font-size: 0.9rem !important;
          line-height: 1.3 !important;
          font-weight: 600 !important;
        }

        .dashboard-header-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          max-width: min(55vw, 280px);
          min-width: 0;
        }

        .dashboard-header-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          min-width: 0;
          max-width: min(42vw, 220px);
        }

        .dashboard-header-actions-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        @media (min-width: 768px) {
          .dashboard-header-card {
            padding: 1rem 1.25rem !important;
          }

          .dashboard-header-logo {
            height: 42px !important;
          }

          .dashboard-header-title {
            font-size: 0.95rem !important;
            line-height: 1.25 !important;
          }

          .dashboard-header-brand {
            max-width: min(50vw, 360px);
          }

          .dashboard-header-actions {
            max-width: min(38vw, 260px);
          }
        }
      `}</style>

      <div
        className="dashboard-header-card"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          borderRadius: '12px',
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          alignItems: 'center',
          columnGap: '0.75rem',
        }}
      >
        {/* Right (RTL start): menu only */}
        <div className="d-flex align-items-center" style={{ zIndex: 1 }}>
          <HeaderIconButton
            title="תפריט"
            ariaLabel="תפריט"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Menu {...ICON_PROPS} />
          </HeaderIconButton>
        </div>

        {/* Center: Logo only */}
        <div className="dashboard-header-brand justify-self-center">
          {logoVisible ? (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '10px',
                padding: '6px 10px',
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
                  height: '36px',
                  maxHeight: '42px',
                  width: 'auto',
                  display: 'block',
                }}
                onError={() => setLogoVisible(false)}
              />
            </div>
          ) : null}
        </div>

        {/* Left (RTL end): action buttons + business name under them */}
        <div className="dashboard-header-actions" style={{ zIndex: 1 }}>
          <div className="dashboard-header-actions-row">
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

            <div className="d-none d-md-flex align-items-center gap-2">
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
          </div>

          <h1
            className="dashboard-header-title fw-bold mb-0 text-truncate text-center"
            style={{
              color: 'white',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              maxWidth: '100%',
            }}
          >
            {underLogoLabel}
          </h1>
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
