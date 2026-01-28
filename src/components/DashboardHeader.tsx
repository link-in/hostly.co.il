'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface DashboardHeaderProps {
  session: any
  title?: string
  subtitle?: string
  showLandingPageButton?: boolean
  currentPage?: 'dashboard' | 'reservations' | 'profile' | 'landing'
}

export default function DashboardHeader({ 
  session, 
  title, 
  subtitle,
  showLandingPageButton = true,
  currentPage = 'dashboard'
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

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = '/dashboard/login'
  }

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
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          position: 'relative'
        }}
      >
        {/* Right: Logo */}
        <div className="d-flex align-items-center gap-2 gap-md-3">
          {logoVisible && (
            <img
              src={logoSrc}
              alt="Hostly"
              className="dashboard-header-logo"
              style={{ objectFit: 'contain' }}
              onError={() => setLogoVisible(false)}
            />
          )}
        </div>

        {/* Center: Title */}
        <div className="position-absolute" style={{ left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <h1 
            className="dashboard-header-title fw-bold mb-0"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {displayTitle}
          </h1>
          {session?.user?.firstName && session?.user?.lastName && (
            <p className="small mb-0 d-none d-md-block" style={{ color: '#667eea', fontWeight: '500' }}>
              שלום {session.user.firstName} {session.user.lastName}
            </p>
          )}
          {subtitle && (
            <p className="small mb-0 text-muted d-none d-md-block">{subtitle}</p>
          )}
        </div>

        {/* Left: Desktop Buttons + Mobile Menu */}
        <div className="d-flex align-items-center gap-2 position-relative">
          {/* Desktop Buttons - Hidden on Mobile */}
          <div className="d-none d-md-flex align-items-center gap-2">
            {currentPage !== 'dashboard' && (
              <Link href="/dashboard">
                <button
                  type="button"
                  className="btn btn-sm d-flex align-items-center justify-content-center"
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '1px solid #667eea',
                    color: '#667eea',
                    backgroundColor: 'transparent',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#667eea'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#667eea'
                  }}
                  title="דף הבית"
                  aria-label="דף הבית"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </button>
              </Link>
            )}

            {showLandingPageButton && session?.user?.landingPageUrl && (
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{
                  width: '36px',
                  height: '36px',
                  border: '1px solid #f093fb',
                  color: '#f093fb',
                  backgroundColor: 'transparent',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f093fb'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#f093fb'
                }}
                onClick={() => window.open(session.user.landingPageUrl, '_blank')}
                title="צפה באתר"
                aria-label="צפה באתר"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}

            <button
              type="button"
              className="btn btn-sm d-flex align-items-center justify-content-center"
              style={{
                width: '36px',
                height: '36px',
                border: '1px solid #764ba2',
                color: '#764ba2',
                backgroundColor: 'transparent',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#764ba2'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#764ba2'
              }}
              onClick={handleLogout}
              title="התנתק"
              aria-label="התנתק"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>

          {/* Menu Button - Always visible */}
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center justify-content-center"
            style={{
              width: '36px',
              height: '36px',
              border: '1px solid #667eea',
              color: '#667eea',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#667eea'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#667eea'
            }}
            aria-label="תפריט"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span style={{ display: 'inline-block', lineHeight: 1, fontSize: '18px' }}>☰</span>
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              className="position-absolute bg-white border rounded-3 shadow-sm p-2"
              style={{ top: '46px', left: 0, minWidth: '200px', zIndex: 10 }}
            >
              {/* Mobile-only buttons */}
              <div className="d-md-none pb-2 mb-2">
                {showLandingPageButton && session?.user?.landingPageUrl && (
                  <button
                    className="dropdown-item py-2 text-end d-flex align-items-center justify-content-end gap-2"
                    onClick={() => {
                      window.open(session.user.landingPageUrl, '_blank')
                      setMenuOpen(false)
                    }}
                  >
                    <span>צפה באתר</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                )}
                <button
                  className="dropdown-item py-2 text-end d-flex align-items-center justify-content-end gap-2"
                  onClick={() => {
                    handleLogout()
                    setMenuOpen(false)
                  }}
                >
                  <span>התנתק</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>

              {/* Navigation Links */}
              <Link 
                className="dropdown-item py-2 text-end" 
                href="/dashboard" 
                onClick={() => setMenuOpen(false)}
              >
                ניהול זמינות/מחירים
              </Link>
              <Link 
                className="dropdown-item py-2 text-end" 
                href="/dashboard/reservations" 
                onClick={() => setMenuOpen(false)}
              >
                כל ההזמנות
              </Link>
              <Link 
                className="dropdown-item py-2 text-end" 
                href="/dashboard/profile" 
                onClick={() => setMenuOpen(false)}
              >
                איזור אישי
              </Link>
              <Link 
                className="dropdown-item py-2 text-end" 
                href="/dashboard/landing" 
                onClick={() => setMenuOpen(false)}
              >
                ניהול דף נחיתה
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
