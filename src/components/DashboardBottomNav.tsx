'use client'

import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  MoreHorizontal,
  Users,
  type LucideProps,
} from 'lucide-react'
import type { DashboardPage } from './DashboardSideDrawer'

const ICON_PROPS: LucideProps = { size: 22, strokeWidth: 1.75 }

interface BottomTab {
  href: string
  label: string
  page: DashboardPage
  icon: typeof CalendarDays
}

const TABS: BottomTab[] = [
  { href: '/dashboard', label: 'יומן', page: 'dashboard', icon: CalendarDays },
  { href: '/dashboard/receipts', label: 'קבלות', page: 'receipts', icon: FileText },
  { href: '/dashboard/customers', label: 'לקוחות', page: 'customers', icon: Users },
]

interface DashboardBottomNavProps {
  currentPage?: DashboardPage
  onMoreClick: () => void
}

export default function DashboardBottomNav({
  currentPage,
  onMoreClick,
}: DashboardBottomNavProps) {
  return (
    <nav className="hostly-bottom-nav" dir="rtl" aria-label="ניווט ראשי">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = currentPage === tab.page
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`hostly-bottom-nav-item${isActive ? ' hostly-bottom-nav-item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon {...ICON_PROPS} aria-hidden />
            <span>{tab.label}</span>
          </Link>
        )
      })}

      <button
        type="button"
        className="hostly-bottom-nav-item"
        onClick={onMoreClick}
        aria-label="עוד תפריט"
      >
        <MoreHorizontal {...ICON_PROPS} aria-hidden />
        <span>עוד</span>
      </button>
    </nav>
  )
}
