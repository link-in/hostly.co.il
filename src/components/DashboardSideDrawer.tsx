'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ExternalLink, LogOut, X, type LucideProps } from 'lucide-react'
import {
  getVisibleNavSections,
  type DashboardPage,
  type NavItem,
} from './dashboardNav'

export type { DashboardPage, NavItem }
export { NAV_ITEMS } from './dashboardNav'

const ICON_PROPS: LucideProps = { size: 16, strokeWidth: 1.75 }

interface DashboardSideDrawerProps {
  open: boolean
  onClose: () => void
  session: any
  currentPage?: DashboardPage
  showLandingPageButton?: boolean
  onLogout: () => void
}

function getInitials(session: any): string {
  const first = session?.user?.firstName?.trim?.()?.[0]
  const last = session?.user?.lastName?.trim?.()?.[0]
  if (first && last) return `${first}${last}`.toUpperCase()
  const name = session?.user?.displayName || session?.user?.email || 'H'
  return String(name).slice(0, 2).toUpperCase()
}

function getDisplayName(session: any): string {
  if (session?.user?.firstName && session?.user?.lastName) {
    return `${session.user.firstName} ${session.user.lastName}`
  }
  return session?.user?.displayName || 'משתמש'
}

export default function DashboardSideDrawer({
  open,
  onClose,
  session,
  currentPage = 'dashboard',
  showLandingPageButton = true,
  onLogout,
}: DashboardSideDrawerProps) {
  const isAdmin = session?.user?.role === 'admin'
  const landingPageUrl = session?.user?.landingPageUrl as string | undefined
  const propertyName = session?.user?.displayName?.trim() || 'Hostly'
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const { mainItems, adminItems, extraItems } = getVisibleNavSections()

  let animIndex = 0

  const renderItem = (item: NavItem, idx: number, extra?: string) => {
    const Icon = item.icon
    const isActive = item.page !== undefined && currentPage === item.page
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`hostly-drawer-item${isActive ? ' hostly-drawer-item--active' : ''}${extra ? ` ${extra}` : ''}`}
        style={{ animationDelay: `${60 + idx * 30}ms` }}
      >
        <span className="hostly-drawer-icon">
          <Icon {...ICON_PROPS} aria-hidden />
        </span>
        <span className="hostly-drawer-label">{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      <div className="hostly-drawer-backdrop" onClick={onClose} aria-hidden />

      <aside className="hostly-drawer-panel" dir="rtl" role="dialog" aria-modal="true" aria-label="תפריט ניווט">
        <div className="hostly-drawer-inner">
          {/* Header: logo + close button */}
          <div className="hostly-drawer-logo-area">
            <div className="hostly-drawer-logo-content">
              {!logoError ? (
                <img
                  src="/photos/hostly-logo.png"
                  alt="Hostly"
                  style={{ height: 28, width: 'auto', objectFit: 'contain' }}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="hostly-drawer-logo-text">Hostly</span>
              )}
              {propertyName !== 'Hostly' && (
                <span className="hostly-drawer-property">{propertyName}</span>
              )}
            </div>
            <button
              type="button"
              className="hostly-drawer-close-btn"
              onClick={onClose}
              aria-label="סגור תפריט"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>

          {/* Profile */}
          <div className="hostly-drawer-profile">
            <div className="hostly-drawer-avatar" aria-hidden>
              {getInitials(session)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="hostly-drawer-user-name">{getDisplayName(session)}</div>
              {session?.user?.email && (
                <div className="hostly-drawer-user-email">{session.user.email}</div>
              )}
            </div>
          </div>

          <div className="hostly-drawer-divider" aria-hidden />

          {/* Nav */}
          <nav className="hostly-drawer-nav">
            {mainItems.map((item) => renderItem(item, animIndex++))}

            {isAdmin && adminItems.length > 0 && (
              <>
                <div className="hostly-drawer-divider" />
                <div className="hostly-drawer-section">ניהול מערכת</div>
                {adminItems.map((item) => renderItem(item, animIndex++))}
              </>
            )}

            {extraItems.length > 0 && (
              <>
                <div className="hostly-drawer-divider" />
                {extraItems.map((item) => renderItem(item, animIndex++))}
              </>
            )}

            {showLandingPageButton && landingPageUrl && (
              <button
                type="button"
                className="hostly-drawer-item"
                style={{ animationDelay: `${60 + animIndex++ * 30}ms` }}
                onClick={() => {
                  window.open(landingPageUrl, '_blank')
                  onClose()
                }}
              >
                <span className="hostly-drawer-icon">
                  <ExternalLink {...ICON_PROPS} aria-hidden />
                </span>
                <span className="hostly-drawer-label">צפה באתר</span>
              </button>
            )}
          </nav>

          <div className="hostly-drawer-divider" aria-hidden />

          {/* Footer / logout */}
          <div className="hostly-drawer-footer">
            <button
              type="button"
              className="hostly-drawer-item hostly-drawer-item--logout"
              style={{ animationDelay: `${60 + animIndex * 30}ms` }}
              onClick={() => {
                onClose()
                onLogout()
              }}
            >
              <span className="hostly-drawer-icon">
                <LogOut {...ICON_PROPS} aria-hidden />
              </span>
              <span className="hostly-drawer-label">התנתק</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
