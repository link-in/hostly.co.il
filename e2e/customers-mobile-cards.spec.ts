import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

const SAMPLE_CUSTOMERS = [
  {
    id: 'cust-1',
    fullName: 'ישראל ישראלי',
    phone: '0501234567',
    email: 'israel@example.com',
    firstBookingDate: '2026-01-10',
    lastBookingDate: '2026-03-15',
    totalBookings: 2,
    bookingSource: 'direct',
  },
  {
    id: 'cust-2',
    fullName: 'דנה כהן',
    phone: '0528676516',
    email: 'dana@example.com',
    firstBookingDate: '2026-02-01',
    lastBookingDate: '2026-02-04',
    totalBookings: 1,
    bookingSource: 'airbnb',
  },
  {
    id: 'cust-3',
    fullName: 'יוסי לוי',
    phone: '0549998877',
    email: 'yossi@example.com',
    firstBookingDate: '2026-03-01',
    lastBookingDate: '2026-03-10',
    totalBookings: 3,
    bookingSource: 'booking',
  },
]

async function openCustomersPage(page: Page, context: BrowserContext, baseURL: string) {
  await signInAsDemoUser(context, baseURL)

  await page.route('**/api/dashboard/arrival-message-skip**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: null }),
    })
  })

  await page.route('**/api/dashboard/customers**', async (route) => {
    const url = route.request().url()
    if (url.includes('/customers/import')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ missingCount: 0, missing: [] }),
      })
      return
    }
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ customers: SAMPLE_CUSTOMERS }),
      })
      return
    }
    await route.continue()
  })

  await page.goto('/dashboard/customers')
  await page.waitForLoadState('networkidle')
}

test.describe('Customers Mobile Responsive Cards (HOS-29)', () => {
  test('renders modern cards on mobile without horizontal table overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openCustomersPage(page, context, baseURL!)

    // Desktop table should not be visible on mobile
    const desktopTable = page.getByTestId('customers-table-desktop')
    await expect(desktopTable).toBeHidden()

    // Mobile cards container should be visible
    const mobileCardsContainer = page.getByTestId('customers-cards-mobile')
    await expect(mobileCardsContainer).toBeVisible()

    // 3 customer cards should be rendered
    const cards = page.getByTestId('customer-card')
    await expect(cards).toHaveCount(3)

    // Check first card details
    const firstCard = cards.nth(0)
    await expect(firstCard.getByTestId('customer-name')).toHaveText('ישראל ישראלי')
    await expect(firstCard.getByText('2 הזמנות')).toBeVisible()
    await expect(firstCard.getByText('ישירות')).toBeVisible()

    // Phone link and quick actions
    const phoneLink = firstCard.getByTestId('customer-phone-link')
    await expect(phoneLink).toBeVisible()
    await expect(phoneLink).toHaveAttribute('href', 'tel:+972501234567')

    const whatsappBtn = firstCard.getByTitle('וואטסאפ')
    await expect(whatsappBtn).toBeVisible()
    await expect(whatsappBtn).toHaveAttribute('href', 'https://wa.me/972501234567')

    // Email link
    const emailLink = firstCard.getByTestId('customer-email-link')
    await expect(emailLink).toBeVisible()
    await expect(emailLink).toHaveAttribute('href', 'mailto:israel@example.com')

    // Dates check
    await expect(firstCard.getByText('הזמנה ראשונה')).toBeVisible()
    await expect(firstCard.getByText('הזמנה אחרונה')).toBeVisible()

    // Check no horizontal scrollbar on body
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)

    // Save screenshot walkthrough artifact for mobile cards
    await page.screenshot({
      path: '/opt/cursor/artifacts/customers_mobile_cards.png',
      fullPage: false,
    })

    // Test search filter on mobile
    await page.getByTestId('customers-search-input').fill('דנה')
    await expect(cards).toHaveCount(1)
    await expect(firstCard.getByTestId('customer-name')).toHaveText('דנה כהן')
    await expect(firstCard.getByText('Airbnb')).toBeVisible()
  })

  test('renders standard table on desktop', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await openCustomersPage(page, context, baseURL!)

    // Desktop table should be visible
    const desktopTable = page.getByTestId('customers-table-desktop')
    await expect(desktopTable).toBeVisible()

    // Mobile cards container should not be visible
    const mobileCardsContainer = page.getByTestId('customers-cards-mobile')
    await expect(mobileCardsContainer).toBeHidden()

    // All rows should be rendered in table
    const names = page.getByTestId('customer-name')
    await expect(names).toHaveCount(3)

    // Save screenshot walkthrough artifact for desktop table
    await page.screenshot({
      path: '/opt/cursor/artifacts/customers_desktop_table.png',
      fullPage: false,
    })
  })
})
