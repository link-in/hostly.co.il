import { test, expect } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { signInAsDemoUser } from './helpers/session'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'

/**
 * HOS-8: Direct/unknown channel fallbacks in the reservations table must use
 * the same muted gray as other lucide icons — not brand purple.
 */
test('Direct booking Globe icon uses muted gray, not brand purple', async ({ page, context, baseURL }) => {
  await signInAsDemoUser(context, baseURL!)

  await page.route('**/api/commission-rates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ rates: { booking: 0.15, airbnb: 0.16, direct: 0 } }),
    })
  })
  await page.route('**/api/dashboard/receipts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ issuedBookingIds: [], receipts: [] }),
    })
  })

  await page.goto('/dashboard')

  const sourceCell = page.locator('td', { hasText: /^Direct$/ }).first()
  await expect(sourceCell).toBeVisible({ timeout: 20_000 })

  const globe = sourceCell.getByTestId('platform-icon-fallback').locator('svg')
  await expect(globe).toBeVisible()
  await expect(globe).toHaveCSS('color', 'rgb(91, 102, 112)') // #5B6670

  if (existsSync('/opt/cursor') || existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true })
    await sourceCell.screenshot({ path: `${ARTIFACTS_DIR}/direct_booking_icon_gray.png` })
    await page.locator('.dashboard-table-scroll-container').first().screenshot({
      path: `${ARTIFACTS_DIR}/reservations_table_direct_icon.png`,
    })
  }
})
