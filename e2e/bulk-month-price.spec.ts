import { test, expect } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

/**
 * Bulk month price: a collapsed panel next to the price form lets the owner set one
 * price for weekend nights (Thu/Fri) and one for the rest, for the month shown in the
 * calendar. Beds24 (`/api/dashboard/rooms` POST) and the cache refresh are mocked.
 */
function todayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

test('updates the shown month with weekend and midweek prices after confirmation', async ({ page, context, baseURL }) => {
  const posted: { calendar: Record<string, unknown>[] }[][] = []

  await signInAsDemoUser(context, baseURL!)
  await page.route('**/api/dashboard/rooms', async (route) => {
    if (route.request().method() === 'POST') {
      posted.push(route.request().postDataJSON())
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      return
    }
    await route.continue()
  })
  await page.route('**/api/dashboard/cache/refresh', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  )

  await page.goto('/dashboard')
  await expect(page.getByTestId('calendar-day').first()).toBeVisible()

  // Hidden until the owner opens it.
  await expect(page.getByTestId('bulk-price-panel')).toHaveCount(0)
  await page.getByTestId('bulk-price-toggle').click()
  await expect(page.getByTestId('bulk-price-panel')).toBeVisible()

  // Nothing to apply until a price is typed.
  await expect(page.getByTestId('bulk-price-apply')).toBeDisabled()

  await page.getByLabel('סוף שבוע (₪)').fill('650')
  await page.getByLabel('אמצע שבוע (₪)').fill('400')
  await page.getByTestId('bulk-price-apply').click()

  // A confirmation step appears first, and nothing was sent yet.
  await expect(page.getByTestId('bulk-price-confirm')).toBeVisible()
  expect(posted).toHaveLength(0)

  await page.getByTestId('bulk-price-confirm-button').click()
  await expect.poll(() => posted.length).toBe(1)

  const calendar = posted[0][0].calendar
  expect(calendar.length).toBeGreaterThan(0)
  const prices = new Set(calendar.map((entry) => entry.price1))
  expect([...prices].every((price) => price === 650 || price === 400)).toBe(true)
  for (const entry of calendar) {
    // Prices only: no availability fields, so blocks and bookings stay as they are.
    expect(Object.keys(entry).sort()).toEqual(['from', 'price1', 'to'])
    expect(String(entry.from) >= todayKey()).toBe(true)
  }
})

test('cancelling the confirmation sends nothing', async ({ page, context, baseURL }) => {
  const posted: unknown[] = []

  await signInAsDemoUser(context, baseURL!)
  await page.route('**/api/dashboard/rooms', async (route) => {
    if (route.request().method() === 'POST') {
      posted.push(route.request().postDataJSON())
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      return
    }
    await route.continue()
  })

  await page.goto('/dashboard')
  await expect(page.getByTestId('calendar-day').first()).toBeVisible()
  await page.getByTestId('bulk-price-toggle').click()
  await page.getByLabel('סוף שבוע (₪)').fill('650')
  await page.getByLabel('אמצע שבוע (₪)').fill('400')
  await page.getByTestId('bulk-price-apply').click()
  await page.getByRole('button', { name: 'ביטול' }).click()

  await expect(page.getByTestId('bulk-price-confirm')).toHaveCount(0)
  expect(posted).toHaveLength(0)
})
