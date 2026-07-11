import { test, expect } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

/**
 * Smoke-level E2E coverage for the "close dates for bookings" feature.
 * Beds24 (`/api/dashboard/rooms` POST) and our cache-refresh endpoint are
 * both intercepted with `page.route()` — this suite never makes a real
 * network call to Beds24 or Supabase. Auth is a signed session cookie for a
 * demo user, which itself renders with a fully synthetic mock data provider
 * (see `src/lib/dashboard/getDashboardProvider.ts`).
 */

/** First day-of-month button, well past the mock provider's hardcoded 2026 reservations. */
function buildFarFutureTargetDate() {
  const target = new Date()
  target.setDate(1) // avoid month-rollover surprises before adding months
  target.setMonth(target.getMonth() + 14)
  target.setDate(15)
  const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
  return { monthsAhead: 14, key }
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await signInAsDemoUser(context, baseURL!)

  await page.route('**/api/dashboard/rooms', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      return
    }
    await route.continue()
  })
  await page.route('**/api/dashboard/cache/refresh', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })

  await page.goto('/dashboard')
  await expect(page.getByTestId('calendar-day').first()).toBeVisible()
})

test('closing a date for bookings blocks it, and releasing the block reopens it', async ({ page }) => {
  const { monthsAhead, key } = buildFarFutureTargetDate()

  const nextMonthButton = page.getByRole('button', { name: 'חודש הבא' })
  for (let i = 0; i < monthsAhead; i += 1) {
    await nextMonthButton.click()
  }

  const day = page.locator(`[data-date="${key}"]`)
  const dayBlockedIndicator = day.getByText('חסום')
  await expect(day).toBeVisible()
  await expect(dayBlockedIndicator).toHaveCount(0) // starts out free

  await day.click()
  const blockButton = page.getByRole('button', { name: 'סגור להזמנות' })
  await expect(blockButton).toBeEnabled()
  await blockButton.click()

  // The success text is shown both as a toast and as an inline alert box —
  // match the inline alert's exact (period-terminated) copy to avoid Playwright's
  // strict-mode ambiguity between the two matching elements.
  await expect(page.getByText('התאריכים נסגרו להזמנות.', { exact: true })).toBeVisible()
  await expect(dayBlockedIndicator.first()).toBeVisible()

  await day.click()
  const unblockButton = page.getByRole('button', { name: 'שחרר חסימה' })
  await expect(unblockButton).toBeEnabled()
  await unblockButton.click()

  await expect(page.getByText('החסימה שוחררה בהצלחה.', { exact: true })).toBeVisible()
  await expect(dayBlockedIndicator).toHaveCount(0)
})
