import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

const SAMPLE_RECEIPTS = [
  {
    id: 'rec-1',
    bookingId: '12345',
    documentType: 'receipt',
    paymentMethod: 'credit_card',
    amount: 1500,
    customerName: 'ישראל ישראלי',
    customerEmail: 'israel@example.com',
    provider: 'icount',
    externalDocNumber: '1001',
    pdfUrl: 'https://example.com/receipt-1001.pdf',
    status: 'issued',
    createdAt: '2026-09-29T12:00:00.000Z',
  },
  {
    id: 'rec-2',
    bookingId: '12346',
    documentType: 'tax_invoice',
    paymentMethod: 'bit',
    amount: 850,
    customerName: 'דנה כהן',
    customerEmail: 'dana@example.com',
    provider: 'icount',
    externalDocNumber: null,
    pdfUrl: null,
    status: 'failed',
    error: 'שגיאת תקשורת עם ספק המסמכים',
    createdAt: '2026-09-29T14:30:00.000Z',
  },
]

async function openReceiptsPage(page: Page, context: BrowserContext, baseURL: string) {
  await signInAsDemoUser(context, baseURL)

  await page.route('**/api/dashboard/arrival-message-skip**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: null }),
    })
  })

  await page.route('**/api/dashboard/receipts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ receipts: SAMPLE_RECEIPTS }),
    })
  })

  await page.goto(`${baseURL}/dashboard/receipts`)
  await page.waitForLoadState('networkidle')
}

test.describe('Receipts Page Mobile Responsiveness (HOS-16)', () => {
  test('renders cards in mobile viewport and equal-height stat tiles', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await openReceiptsPage(page, context, baseURL!)

    // Take screenshot of mobile receipts view for walkthrough artifacts
    await page.screenshot({ path: '/opt/cursor/artifacts/receipts_mobile_view.png', fullPage: true })

    // Header stat cards: verify they exist and have matching heights
    const statCards = page.locator('.hostly-dark-stat')
    await expect(statCards).toHaveCount(3)

    const box1 = await statCards.nth(0).boundingBox()
    const box2 = await statCards.nth(1).boundingBox()
    const box3 = await statCards.nth(2).boundingBox()

    expect(box1).not.toBeNull()
    expect(box2).not.toBeNull()
    expect(box3).not.toBeNull()

    // Heights should be identical because of h-100 in the grid row
    expect(Math.abs(box1!.height - box2!.height)).toBeLessThanOrEqual(2)
    expect(Math.abs(box2!.height - box3!.height)).toBeLessThanOrEqual(2)

    // Filter controls: should have filter buttons and refresh button visible
    const filterAllBtn = page.getByRole('button', { name: 'הכל' })
    const filterIssuedBtn = page.getByRole('button', { name: 'הונפקו' })
    const filterFailedBtn = page.getByRole('button', { name: 'נכשלו' })
    const refreshBtn = page.getByRole('button', { name: /רענון/ })

    await expect(filterAllBtn).toBeVisible()
    await expect(filterIssuedBtn).toBeVisible()
    await expect(filterFailedBtn).toBeVisible()
    await expect(refreshBtn).toBeVisible()

    // On mobile, the desktop table container should be hidden and mobile cards visible
    const desktopTableContainer = page.locator('.hostly-datatable-desktop')
    await expect(desktopTableContainer).toBeHidden()

    // Mobile data cards
    const mobileCards = page.locator('.hostly-datatable-mobile > div')
    await expect(mobileCards).toHaveCount(2)

    await expect(mobileCards.nth(0).getByText('ישראל ישראלי').first()).toBeVisible()
    await expect(mobileCards.nth(1).getByText('דנה כהן').first()).toBeVisible()

    // Scroll slightly down and take a second screenshot showing both full cards
    await page.evaluate(() => window.scrollBy(0, 150))
    await page.screenshot({ path: '/opt/cursor/artifacts/receipts_mobile_cards.png' })

    // Check card details
    await expect(mobileCards.nth(0).getByText('₪1,500')).toBeVisible()
    await expect(mobileCards.nth(1).getByText('₪850')).toBeVisible()
    await expect(mobileCards.nth(0).getByText('הונפק')).toBeVisible()
    await expect(mobileCards.nth(1).getByText('נכשל')).toBeVisible()
  })

  test('renders table in desktop viewport', async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await openReceiptsPage(page, context, baseURL!)

    const desktopTable = page.locator('.table.hostly-dark-table')
    await expect(desktopTable).toBeVisible()
  })
})
