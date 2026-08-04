'use client'

import Link from 'next/link'
import { useEffect, type ComponentType } from 'react'
import {
  BadgeCheck,
  Calculator,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  KeyRound,
  LayoutTemplate,
  LogOut,
  MessageSquare,
  Shield,
  UserCog,
  UserRound,
  Users,
  type LucideProps,
} from 'lucide-react'

export type DashboardPage =
  | 'dashboard'
  | 'reservations'
  | 'customers'
  | 'price-check'
  | 'profile'
  | 'landing'
  | 'pricing-demo'
  | 'check-ins'
  | 'admin'
  | 'pricing'
  | 'api-keys'
  | 'messages'

type IconComponent = ComponentType<LucideProps>

interface NavItem {
  href: string
  label: string
  icon: IconComponent
  page?: DashboardPage
  adminOnly?: boolean
  section?: 'main' | 'admin'
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ניהול זמינות/מחירים', icon: CalendarDays, page: 'dashboard', section: 'main' },
  { href: '/dashboard/reservations', label: 'כל ההזמנות', icon: ClipboardList, page: 'reservations', section: 'main' },
  { href: '/dashboard/customers', label: 'מאגר לקוחות', icon: Users, page: 'customers', section: 'main' },
  { href: '/dashboard/check-ins', label: "צ'ק-אין דיגיטלי", icon: BadgeCheck, page: 'check-ins', section: 'main' },
  { href: '/dashboard/messages', label: 'הודעות WhatsApp', icon: MessageSquare, page: 'messages', section: 'main' },
  { href: '/dashboard/price-check', label: 'בדיקת מחיר', icon: CircleHelp, page: 'price-check', section: 'main' },
  { href: '/dashboard/pricing-demo', label: 'מחשבון מחירים', icon: Calculator, page: 'pricing-demo', section: 'main' },
  { href: '/dashboard/profile', label: 'איזור אישי', icon: UserRound, page: 'profile', section: 'main' },
  { href: '/admin', label: 'לוח בקרה אדמין', icon: Shield, page: 'admin', adminOnly: true, section: 'admin' },
  { href: '/admin/users', label: 'ניהול משתמשים', icon: UserCog, adminOnly: true, section: 'admin' },
  { href: '/dashboard/api-keys', label: 'מפתחות API', icon: KeyRound, page: 'api-keys', section: 'main' },
  { href: '/dashboard/landing', label: 'ניהול דף נחיתה', icon: LayoutTemplate, page: 'landing', section: 'main' },
]

const ICON_PROPS: LucideProps = {
  size: 20,
  strokeWidth: 1.5,
}

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

  const mainItems = NAV_ITEMS.filter((item) => item.section === 'main' && !item.adminOnly)
  const adminItems = NAV_ITEMS.filter((item) => item.adminOnly)
  const afterAdminItems = mainItems.filter(
    (item) => item.page === 'api-keys' || item.page === 'landing'
  )
  const beforeAdminItems = mainItems.filter(
    (item) => item.page !== 'api-keys' && item.page !== 'landing'
  )

  const renderNavLink = (item: NavItem, index: number) => {
    const Icon = item.icon
    const isActive = item.page !== undefined && currentPage === item.page

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`side-drawer-item${isActive ? ' side-drawer-item-active' : ''}`}
        style={{ animationDelay: `${80 + index * 35}ms` }}
      >
        <span className="side-drawer-icon-wrap">
          <Icon {...ICON_PROPS} aria-hidden />
        </span>
        <span className="side-drawer-item-label">{item.label}</span>
        {isActive && <span className="side-drawer-active-dot" aria-hidden />}
      </Link>
    )
  }

  let animIndex = 0

  return (
    <>
      <style jsx global>{`
        @keyframes sideDrawerSlideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes sideDrawerFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes sideDrawerItemIn {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes sideDrawerShine {
          0% {
            transform: translateX(30%) rotate(18deg);
          }
          100% {
            transform: translateX(-120%) rotate(18deg);
          }
        }

        .side-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 1040;
          animation: sideDrawerFadeIn 0.25s ease-out;
        }

        .side-drawer-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(85vw, 330px);
          z-index: 1050;
          display: flex;
          flex-direction: column;
          border-radius: 24px 0 0 24px;
          overflow: visible;
          color: #fff;
          isolation: isolate;
          animation: sideDrawerSlideIn 0.32s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow:
            -20px 0 60px rgba(0, 0, 0, 0.55),
            -1px 0 0 rgba(255, 255, 255, 0.06) inset;
        }

        .side-drawer-surface {
          position: absolute;
          inset: 0;
          border-radius: 24px 0 0 24px;
          overflow: hidden;
          background:
            radial-gradient(ellipse 120% 80% at 100% -10%, rgba(90, 90, 90, 0.45) 0%, transparent 55%),
            radial-gradient(ellipse 90% 60% at 0% 100%, rgba(40, 40, 40, 0.7) 0%, transparent 50%),
            linear-gradient(165deg, #1f1f1f 0%, #0c0c0c 42%, #000000 100%);
          pointer-events: none;
        }

        .side-drawer-surface::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
          opacity: 0.07;
          mix-blend-mode: overlay;
        }

        .side-drawer-surface::after {
          content: '';
          position: absolute;
          top: -40%;
          right: -20%;
          width: 70%;
          height: 90%;
          background: linear-gradient(
            115deg,
            transparent 30%,
            rgba(255, 255, 255, 0.04) 48%,
            transparent 62%
          );
          animation: sideDrawerShine 9s ease-in-out infinite alternate;
          pointer-events: none;
        }

        .side-drawer-edge {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 1px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(255, 255, 255, 0.04) 40%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 2;
        }

        .side-drawer-close-tab {
          position: absolute;
          top: 32px;
          left: -20px;
          width: 40px;
          height: 56px;
          border: none;
          padding: 0;
          cursor: pointer;
          background: linear-gradient(160deg, #222 0%, #0a0a0a 100%);
          color: rgba(255, 255, 255, 0.75);
          border-radius: 20px 0 0 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            -4px 4px 16px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          border-left: 1px solid rgba(255, 255, 255, 0.06);
          transition: color 0.2s ease, transform 0.2s ease;
          z-index: 3;
        }

        .side-drawer-close-tab:hover {
          color: #fff;
          transform: translateX(-2px);
        }

        .side-drawer-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 32px 22px 22px;
          overflow-y: auto;
          border-radius: 24px 0 0 24px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }

        .side-drawer-profile {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 10px;
          padding: 14px 12px;
          border-radius: 16px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.07) 0%,
            rgba(255, 255, 255, 0.02) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .side-drawer-avatar {
          position: relative;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.04em;
          flex-shrink: 0;
          color: #fff;
          background: linear-gradient(145deg, #3a3a3a 0%, #1a1a1a 100%);
          border: 1.5px solid rgba(255, 255, 255, 0.35);
          box-shadow:
            0 0 0 3px rgba(255, 255, 255, 0.06),
            0 8px 20px rgba(0, 0, 0, 0.4);
        }

        .side-drawer-avatar::after {
          content: '';
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          pointer-events: none;
        }

        .side-drawer-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.3;
          color: #fff;
          letter-spacing: -0.01em;
        }

        .side-drawer-email {
          margin: 3px 0 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.48);
          word-break: break-all;
          font-weight: 400;
        }

        .side-drawer-divider {
          height: 1px;
          margin: 18px 4px 14px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.18) 20%,
            rgba(255, 255, 255, 0.18) 80%,
            transparent
          );
        }

        .side-drawer-nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .side-drawer-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 11px 12px;
          border-radius: 12px;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.82);
          font-size: 14.5px;
          font-weight: 500;
          letter-spacing: -0.01em;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
          border: 1px solid transparent;
          background: transparent;
          width: 100%;
          cursor: pointer;
          text-align: start;
          opacity: 0;
          animation: sideDrawerItemIn 0.35s ease-out forwards;
        }

        .side-drawer-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.06);
          color: #fff;
          transform: translateX(-2px);
        }

        .side-drawer-item:hover .side-drawer-icon-wrap {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .side-drawer-item-active {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(255, 255, 255, 0.04) 100%
          );
          border-color: rgba(255, 255, 255, 0.1);
          color: #fff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .side-drawer-item-active .side-drawer-icon-wrap {
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
        }

        .side-drawer-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: background 0.2s ease, color 0.2s ease;
        }

        .side-drawer-item-label {
          flex: 1;
          min-width: 0;
        }

        .side-drawer-active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.55);
          flex-shrink: 0;
        }

        .side-drawer-section-label {
          padding: 16px 12px 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.32);
        }

        .side-drawer-footer {
          margin-top: auto;
          padding-top: 8px;
        }

        .side-drawer-footer .side-drawer-item {
          color: rgba(255, 255, 255, 0.65);
        }

        .side-drawer-footer .side-drawer-item:hover {
          color: #fff;
          background: rgba(220, 38, 38, 0.15);
          border-color: rgba(220, 38, 38, 0.2);
        }

        .side-drawer-footer .side-drawer-item:hover .side-drawer-icon-wrap {
          background: rgba(220, 38, 38, 0.2);
          color: #fca5a5;
          border-color: rgba(220, 38, 38, 0.25);
        }
      `}</style>

      <div className="side-drawer-backdrop" onClick={onClose} aria-hidden />

      <aside className="side-drawer-panel" dir="rtl" role="dialog" aria-modal="true" aria-label="תפריט ניווט">
        <div className="side-drawer-surface" aria-hidden />
        <div className="side-drawer-edge" aria-hidden />

        <button
          type="button"
          className="side-drawer-close-tab"
          onClick={onClose}
          aria-label="סגור תפריט"
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>

        <div className="side-drawer-inner">
          <div className="side-drawer-profile">
            <div className="side-drawer-avatar" aria-hidden>
              {getInitials(session)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="side-drawer-name">{getDisplayName(session)}</p>
              {session?.user?.email && (
                <p className="side-drawer-email">{session.user.email}</p>
              )}
            </div>
          </div>

          <div className="side-drawer-divider" aria-hidden />

          <nav className="side-drawer-nav">
            {beforeAdminItems.map((item) => renderNavLink(item, animIndex++))}

            {isAdmin && adminItems.length > 0 && (
              <>
                <div className="side-drawer-section-label">ניהול מערכת</div>
                {adminItems.map((item) => renderNavLink(item, animIndex++))}
              </>
            )}

            {afterAdminItems.map((item) => renderNavLink(item, animIndex++))}

            {showLandingPageButton && landingPageUrl && (
              <button
                type="button"
                className="side-drawer-item"
                style={{ animationDelay: `${80 + animIndex++ * 35}ms` }}
                onClick={() => {
                  window.open(landingPageUrl, '_blank')
                  onClose()
                }}
              >
                <span className="side-drawer-icon-wrap">
                  <ExternalLink {...ICON_PROPS} aria-hidden />
                </span>
                <span className="side-drawer-item-label">צפה באתר</span>
              </button>
            )}
          </nav>

          <div className="side-drawer-divider" aria-hidden />

          <div className="side-drawer-footer">
            <button
              type="button"
              className="side-drawer-item"
              style={{ animationDelay: `${80 + animIndex * 35}ms` }}
              onClick={() => {
                onClose()
                onLogout()
              }}
            >
              <span className="side-drawer-icon-wrap">
                <LogOut {...ICON_PROPS} aria-hidden />
              </span>
              <span className="side-drawer-item-label">התנתק</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
