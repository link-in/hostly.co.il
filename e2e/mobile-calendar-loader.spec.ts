import { test, expect, type Page } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

/**
 * HOS-7: mobile dashboard was showing stacked branded loaders (reservations +
 * calendar). On viewports below Bootstrap `md`, the calendar spinner is hidden
 * and the calendar grid renders immediately; desktop still shows the calendar
 * loader until the first prices payload settles.
 *
 * `Promise.allSettled` in DashboardClient waits on `/api/commission-rates`, so
 * holding that route keeps the section loaders on screen without live Beds24.
 */

async function holdDashboardLoad(page: Page) {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })

  await page.route('**/api/commission-rates', async (route) => {
    await held
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ rates: { booking: 0.15, airbnb: 0.16 } }),
    })
  })

  return { release }
}

async function openHeldDashboard(page: Page, context: Parameters<typeof signInAsDemoUser>[0], baseURL: string) {
  await signInAsDemoUser(context, baseURL)
  const hold = await holdDashboardLoad(page)
  await page.goto('/dashboard')
  await expect(page.getByTestId('reservations-section-loader')).toBeVisible()
  return hold
}

test.describe('mobile dashboard loaders', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('hides the calendar loader and still shows the reservations loader', async ({ page, context, baseURL }) => {
    const { release } = await openHeldDashboard(page, context, baseURL!)

    await expect(page.getByTestId('calendar-section-loader')).toBeHidden()
    await expect(page.getByTestId('summary-section-loader')).toBeHidden()
    await expect(page.getByTestId('calendar-day').first()).toBeVisible()
    await expect(page.getByText('טוען הזמנות…')).toBeVisible()
    await expect(page.getByText('טוען לוח שנה ומחירים…')).toHaveCount(0)

    release()
  })
})

test.describe('desktop dashboard loaders', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('still shows the calendar section loader while prices load', async ({ page, context, baseURL }) => {
    const { release } = await openHeldDashboard(page, context, baseURL!)

    await expect(page.getByTestId('calendar-section-loader')).toBeVisible()
    await expect(page.getByTestId('summary-section-loader')).toBeVisible()
    await expect(page.getByText('טוען לוח שנה ומחירים…')).toBeVisible()
    await expect(page.getByTestId('calendar-pricing-panel')).toBeHidden()

    release()
  })
})
