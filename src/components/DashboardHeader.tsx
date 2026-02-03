'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface DashboardHeaderProps {
  session: any
  title?: string
  subtitle?: string
  showLandingPageButton?: boolean
  currentPage?: 'dashboard' | 'reservations' | 'customers' | 'price-check' | 'profile' | 'landing' | 'pricing-demo'
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
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .menu-item {
          transition: all 0.2s ease;
          border-radius: 8px;
          margin: 4px 8px;
        }
        
        .menu-item:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(249, 147, 251, 0.08) 100%);
          padding-right: 16px !important;
        }
        
        .menu-item-active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(249, 147, 251, 0.12) 100%);
        }
        
        .menu-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.2), transparent);
          margin: 8px 0;
        }
      `}</style>

      <div 
        className="dashboard-header-card d-flex align-items-center justify-content-between gap-2 gap-md-3"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          borderRadius: '12px',
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
          position: 'relative'
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
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
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
        <div className="position-absolute" style={{ left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
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
            <p className="small mb-0 d-none d-md-block" style={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: '500' }}>
              שלום {session.user.firstName} {session.user.lastName}
            </p>
          )}
          {subtitle && (
            <p className="small mb-0 d-none d-md-block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{subtitle}</p>
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
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
                    e.currentTarget.style.borderColor = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
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
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
                  e.currentTarget.style.borderColor = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
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
                border: '2px solid rgba(255, 255, 255, 0.5)',
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
                e.currentTarget.style.borderColor = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
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
              border: '2px solid rgba(255, 255, 255, 0.5)',
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
              e.currentTarget.style.borderColor = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
            }}
            aria-label="תפריט"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span style={{ display: 'inline-block', lineHeight: 1, fontSize: '18px' }}>☰</span>
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="position-fixed top-0 start-0 w-100 h-100"
                style={{ zIndex: 998 }}
                onClick={() => setMenuOpen(false)}
              />
              
              <div
                className="position-absolute bg-white rounded-3 shadow-lg overflow-hidden"
                dir="rtl"
                style={{ 
                  top: '46px', 
                  left: 0, 
                  minWidth: '280px', 
                  zIndex: 999,
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                  animation: 'slideDown 0.2s ease-out'
                }}
              >
                {/* Mobile-only buttons */}
                <div className="d-md-none pt-2">
                  {showLandingPageButton && session?.user?.landingPageUrl && (
                    <button
                      className="menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3"
                      onClick={() => {
                        window.open(session.user.landingPageUrl, '_blank')
                        setMenuOpen(false)
                      }}
                    >
                      <div 
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white'
                        }}
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
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: '500', color: '#333' }}>צפה באתר</span>
                    </button>
                  )}
                  <button
                    className="menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3"
                    onClick={() => {
                      handleLogout()
                      setMenuOpen(false)
                    }}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                        color: 'white'
                      }}
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
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#dc3545' }}>התנתק</span>
                  </button>
                  
                  <div className="menu-divider" />
                </div>

                {/* Navigation Links */}
                <div className="py-2">
                  <Link 
                    className={`menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3 text-decoration-none ${currentPage === 'dashboard' ? 'menu-item-active' : ''}`}
                    href="/dashboard" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                      }}
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
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#333' }}>ניהול זמינות/מחירים</span>
                  </Link>
                  
                  <Link 
                    className={`menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3 text-decoration-none ${currentPage === 'reservations' ? 'menu-item-active' : ''}`}
                    href="/dashboard/reservations" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white'
                      }}
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#333' }}>כל ההזמנות</span>
                  </Link>
                  
                  <Link 
                    className={`menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3 text-decoration-none ${currentPage === 'customers' ? 'menu-item-active' : ''}`}
                    href="/dashboard/customers" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                        color: 'white'
                      }}
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
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#333' }}>ניהול לקוחות</span>
                  </Link>
                  
                  <Link 
                    className={`menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3 text-decoration-none ${currentPage === 'price-check' ? 'menu-item-active' : ''}`}
                    href="/dashboard/price-check" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                        color: 'white'
                      }}
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
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#333' }}>בדיקת מחיר</span>
                  </Link>
                  
                  <Link 
                    className={`menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3 text-decoration-none ${currentPage === 'pricing-demo' ? 'menu-item-active' : ''}`}
                    href="/dashboard/pricing-demo" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
                        color: 'white'
                      }}
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
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#333' }}>מחשבון מחירים</span>
                  </Link>
                  
                  <Link 
                    className={`menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3 text-decoration-none ${currentPage === 'profile' ? 'menu-item-active' : ''}`}
                    href="/dashboard/profile" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white'
                      }}
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
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#333' }}>איזור אישי</span>
                  </Link>
                  
                  <Link 
                    className={`menu-item w-100 border-0 bg-transparent py-3 px-3 d-flex align-items-center justify-content-start gap-3 text-decoration-none ${currentPage === 'landing' ? 'menu-item-active' : ''}`}
                    href="/dashboard/landing" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        color: 'white'
                      }}
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
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#333' }}>ניהול דף נחיתה</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
