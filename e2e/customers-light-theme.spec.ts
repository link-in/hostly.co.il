import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

/**
 * HOS-11: רשימת הלקוחות נשארה עם טקסט לבן/ורוד מהערכת הדשבורד הישנה,
 * ואחרי המעבר לרקע בהיר אי אפשר היה לקרוא את העמוד. בודקים שהכותרת,
 * השמות והקישורים משתמשים בפלטת הדשבורד הבהירה (טקסט כהה + סגול מותג).
 */

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
}

test.describe('customers list light theme', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('uses dark readable text and brand purple links on a light surface', async ({
    page,
    context,
    baseURL,
  }) => {
    await openCustomersPage(page, context, baseURL!)

    const title = page.getByTestId('customers-title')
    await expect(title).toBeVisible()
    await expect(title).toHaveText('רשימת לקוחות')
    await expect(title).toHaveCSS('color', 'rgb(47, 49, 51)')

    const subtitle = page.getByTestId('customers-subtitle')
    await expect(subtitle).toBeVisible()
    await expect(subtitle).toHaveCSS('color', 'rgb(91, 102, 112)')

    const countBadge = page.getByTestId('customers-count-badge')
    await expect(countBadge).toHaveText('2')
    await expect(countBadge).toHaveCSS('color', 'rgb(113, 51, 217)')
    await expect(countBadge).toHaveCSS('background-color', 'rgb(239, 235, 255)')

    const guestName = page.getByTestId('customer-name').first()
    await expect(guestName).toHaveText('ישראל ישראלי')
    await expect(guestName).toHaveCSS('color', 'rgb(47, 49, 51)')

    const phoneLink = page.getByTestId('customer-phone-link').first()
    await expect(phoneLink).toBeVisible()
    await expect(phoneLink).toHaveCSS('color', 'rgb(113, 51, 217)')

    const emailLink = page.getByTestId('customer-email-link').first()
    await expect(emailLink).toBeVisible()
    await expect(emailLink).toHaveCSS('color', 'rgb(113, 51, 217)')

    const importButton = page.getByRole('button', { name: 'סנכרון מהזמנות' })
    await expect(importButton).toBeVisible()
    const importColor = await importButton.evaluate((el) => getComputedStyle(el).color)
    expect(importColor).not.toBe('rgb(255, 255, 255)')
    expect(importColor).not.toMatch(/^rgba\(255,\s*255,\s*255/)
  })
})
