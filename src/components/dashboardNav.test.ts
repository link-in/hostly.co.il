import { describe, expect, it } from 'vitest'
import {
  NAV_ITEMS,
  getVisibleNavItems,
  getVisibleNavSections,
  isNavItemVisible,
  type NavItem,
} from './dashboardNav'

const checkInItem = NAV_ITEMS.find((item) => item.page === 'check-ins')
const arrivalMessageItem = NAV_ITEMS.find((item) => item.page === 'arrival-message')
const messagesItem = NAV_ITEMS.find((item) => item.page === 'messages')

describe('isNavItemVisible', () => {
  it('treats items without hidden as visible', () => {
    expect(isNavItemVisible({ href: '/x', label: 'x', icon: NAV_ITEMS[0].icon })).toBe(true)
  })

  it('hides items marked hidden: true', () => {
    expect(isNavItemVisible({ href: '/x', label: 'x', icon: NAV_ITEMS[0].icon, hidden: true })).toBe(false)
  })
})

describe('NAV_ITEMS — HOS-12 temporary hide', () => {
  it('keeps the digital check-in entry so the route can be restored later', () => {
    expect(checkInItem).toBeDefined()
    expect(checkInItem?.href).toBe('/dashboard/check-ins')
    expect(checkInItem?.label).toBe("צ'ק-אין דיגיטלי")
  })

  it('marks digital check-in as hidden from the menu', () => {
    expect(checkInItem?.hidden).toBe(true)
    expect(isNavItemVisible(checkInItem!)).toBe(false)
  })
})

describe('NAV_ITEMS — HOS-22 consolidate into WhatsApp messages page', () => {
  it('keeps the arrival-message entry for route compatibility', () => {
    expect(arrivalMessageItem).toBeDefined()
    expect(arrivalMessageItem?.href).toBe('/dashboard/arrival-message')
    expect(arrivalMessageItem?.label).toBe('הודעת יום הגעה')
  })

  it('marks arrival-message as hidden from the menu', () => {
    expect(arrivalMessageItem?.hidden).toBe(true)
    expect(isNavItemVisible(arrivalMessageItem!)).toBe(false)
  })

  it('keeps the unified messages page visible in the menu', () => {
    expect(messagesItem).toBeDefined()
    expect(messagesItem?.href).toBe('/dashboard/messages')
    expect(isNavItemVisible(messagesItem!)).toBe(true)
  })
})

describe('getVisibleNavItems', () => {
  it('omits hidden items from the rendered menu list', () => {
    const pages = getVisibleNavItems().map((item) => item.page)
    expect(pages).not.toContain('check-ins')
  })

  it('still includes the rest of the main dashboard links', () => {
    const hrefs = getVisibleNavItems().map((item) => item.href)
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/dashboard/reservations')
    expect(hrefs).toContain('/dashboard/customers')
    expect(hrefs).toContain('/dashboard/messages')
    expect(hrefs).toContain('/dashboard/profile')
  })
})

describe('getVisibleNavSections', () => {
  it('does not put check-ins in the main, admin, or extra sections', () => {
    const { mainItems, adminItems, extraItems } = getVisibleNavSections()
    const pages = [...mainItems, ...adminItems, ...extraItems].map((item) => item.page)
    expect(pages).not.toContain('check-ins')
  })

  it('keeps extra items (API keys) visible while landing stays hidden by HOS-17', () => {
    const { extraItems } = getVisibleNavSections()
    expect(extraItems.map((item) => item.page)).toEqual(['api-keys'])
  })

  it('hides the landing editor nav item while LANDING_EDITOR_ENABLED is off', () => {
    const { extraItems } = getVisibleNavSections()
    expect(extraItems.some((item) => item.page === 'landing')).toBe(false)
  })

  it('shows check-ins again when the hidden flag is removed', () => {
    const restored: NavItem[] = NAV_ITEMS.map((item) =>
      item.page === 'check-ins' ? { ...item, hidden: false } : item
    )
    const { mainItems } = getVisibleNavSections(restored)
    expect(mainItems.some((item) => item.page === 'check-ins')).toBe(true)
  })
})
