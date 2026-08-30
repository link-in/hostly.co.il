'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { LogOut } from 'lucide-react'
import { NAV_ITEMS, type NavItem, type DashboardPage } from './DashboardSideDrawer'

const ICON_PROPS = { size: 16, strokeWidth: 1.75 } as const

function getActivePage(pathname: string): DashboardPage | undefined {
  const sorted = [...NAV_ITEMS]
    .filter((item) => item.page && item.href !== '#')
    .sort((a, b) => b.href.length - a.href.length)

  const match = sorted.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )
  return match?.page
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

function SidebarNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`hostly-sb-item${isActive ? ' hostly-sb-item--active' : ''}`}
    >
      <span className="hostly-sb-icon">
        <Icon {...ICON_PROPS} aria-hidden />
      </span>
      <span className="hostly-sb-label">{item.label}</span>
    </Link>
  )
}

export default function DashboardSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [logoError, setLogoError] = useState(false)

  const currentPage = getActivePage(pathname)
  const isAdmin = session?.user?.role === 'admin'

  const handleLogout = useCallback(async () => {
    await signOut({ redirect: false })
    router.push('/')
  }, [router])

  const mainItems = NAV_ITEMS.filter(
    (item) => item.section === 'main' && !item.adminOnly && item.page !== 'api-keys' && item.page !== 'landing'
  )
  const adminItems = NAV_ITEMS.filter((item) => item.adminOnly)
  const extraItems = NAV_ITEMS.filter(
    (item) => item.section === 'main' && !item.adminOnly && (item.page === 'api-keys' || item.page === 'landing')
  )

  const propertyName = session?.user?.displayName?.trim() || 'Hostly'

  return (
    <aside className="hostly-sidebar" dir="rtl" aria-label="תפריט ניווט">
      {/* Logo / brand area */}
      <div className="hostly-sidebar-logo-area">
        {!logoError ? (
          <img
            src="/photos/hostly-logo.png"
            alt="Hostly"
            style={{ height: 32, width: 'auto', objectFit: 'contain' }}
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="hostly-sidebar-logo-text">Hostly</span>
        )}
        {propertyName !== 'Hostly' && (
          <span className="hostly-sidebar-property">{propertyName}</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="hostly-sidebar-nav">
        {mainItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            isActive={!!item.page && currentPage === item.page}
          />
        ))}

        {isAdmin && adminItems.length > 0 && (
          <>
            <div className="hostly-sb-divider" />
            <div className="hostly-sb-section">ניהול מערכת</div>
            {adminItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                isActive={!!item.page && currentPage === item.page}
              />
            ))}
          </>
        )}

        {extraItems.length > 0 && (
          <>
            <div className="hostly-sb-divider" />
            {extraItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                isActive={!!item.page && currentPage === item.page}
              />
            ))}
          </>
        )}
      </nav>

      {/* Footer: profile + logout */}
      <div className="hostly-sidebar-footer">
        <div className="hostly-sidebar-profile">
          <div className="hostly-sidebar-avatar" aria-hidden>
            {getInitials(session)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="hostly-sidebar-user-name">{getDisplayName(session)}</div>
            {session?.user?.email && (
              <div className="hostly-sidebar-user-email">{session.user.email}</div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="hostly-sb-item hostly-sb-item--logout"
          onClick={handleLogout}
        >
          <span className="hostly-sb-icon">
            <LogOut {...ICON_PROPS} aria-hidden />
          </span>
          <span className="hostly-sb-label">התנתק</span>
        </button>
      </div>
    </aside>
  )
}
