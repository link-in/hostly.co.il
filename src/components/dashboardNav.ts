import type { ComponentType } from 'react'
import {
  BadgeCheck,
  BellRing,
  Calculator,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  FileText,
  KeyRound,
  LayoutTemplate,
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
  | 'receipts'
  | 'arrival-message'

type IconComponent = ComponentType<LucideProps>

export interface NavItem {
  href: string
  label: string
  icon: IconComponent
  page?: DashboardPage
  adminOnly?: boolean
  section?: 'main' | 'admin'
  /**
   * הסתרה זמנית מהתפריט בלי למחוק את הפריט או את הדף עצמו.
   * דפים מוסתרים נשארים נגישים בכתובת הישירה.
   */
  hidden?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ניהול זמינות/מחירים', icon: CalendarDays, page: 'dashboard', section: 'main' },
  { href: '/dashboard/reservations', label: 'כל ההזמנות', icon: ClipboardList, page: 'reservations', section: 'main' },
  { href: '/dashboard/customers', label: 'מאגר לקוחות', icon: Users, page: 'customers', section: 'main' },
  // HOS-12: הסתרה זמנית של צ'ק-אין דיגיטלי מהתפריט. להחזיר — הסירו את hidden: true.
  { href: '/dashboard/check-ins', label: "צ'ק-אין דיגיטלי", icon: BadgeCheck, page: 'check-ins', section: 'main', hidden: true },
  { href: '/dashboard/messages', label: 'הודעות WhatsApp', icon: MessageSquare, page: 'messages', section: 'main' },
  { href: '/dashboard/arrival-message', label: 'הודעת יום הגעה', icon: BellRing, page: 'arrival-message', section: 'main' },
  { href: '/dashboard/receipts', label: 'קבלות וחשבוניות', icon: FileText, page: 'receipts', section: 'main' },
  { href: '/dashboard/price-check', label: 'בדיקת מחיר', icon: CircleHelp, page: 'price-check', section: 'main' },
  { href: '/dashboard/pricing-demo', label: 'מחשבון מחירים', icon: Calculator, page: 'pricing-demo', section: 'main' },
  { href: '/dashboard/profile', label: 'איזור אישי', icon: UserRound, page: 'profile', section: 'main' },
  { href: '/admin', label: 'לוח בקרה אדמין', icon: Shield, page: 'admin', adminOnly: true, section: 'admin' },
  { href: '/admin/users', label: 'ניהול משתמשים', icon: UserCog, adminOnly: true, section: 'admin' },
  { href: '/dashboard/api-keys', label: 'מפתחות API', icon: KeyRound, page: 'api-keys', section: 'main' },
  { href: '/dashboard/landing', label: 'ניהול דף נחיתה', icon: LayoutTemplate, page: 'landing', section: 'main' },
]

export function isNavItemVisible(item: NavItem): boolean {
  return item.hidden !== true
}

export function getVisibleNavItems(items: NavItem[] = NAV_ITEMS): NavItem[] {
  return items.filter(isNavItemVisible)
}

export function getVisibleNavSections(items: NavItem[] = NAV_ITEMS) {
  const visible = getVisibleNavItems(items)
  return {
    mainItems: visible.filter(
      (item) => item.section === 'main' && !item.adminOnly && item.page !== 'api-keys' && item.page !== 'landing'
    ),
    adminItems: visible.filter((item) => item.adminOnly),
    extraItems: visible.filter(
      (item) => item.section === 'main' && !item.adminOnly && (item.page === 'api-keys' || item.page === 'landing')
    ),
  }
}
