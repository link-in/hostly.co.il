import { test, expect } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

/**
 * HOS-9: booking requests / Airbnb inquiries must appear on the pricing
 * calendar in a distinct (amber) color, and Direct requests can be approved
 * in-app. Demo mock data for DEMO_ROOM_001 includes:
 *   - inquiry  2026-09-18..21  נועה ברק   (Airbnb — approve on channel)
 *   - request  2026-09-22..24  יואב מזרחי (Direct — approve via Beds24 API)
 */

async function goToSeptember2026(page: import('@playwright/test').Page) {
  const target = new Date(2026, 8, 1)
  const now = new Date()
  now.setDate(1)
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  if (months === 0) return
  const button = page.getByRole('button', { name: months > 0 ? 'חודש הבא' : 'חודש קודם' })
  for (let i = 0; i < Math.abs(months); i += 1) {
    await button.click()
  }
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await signInAsDemoUser(context, baseURL!)
  await page.goto('/dashboard')
  await expect(page.getByTestId('calendar-day').first()).toBeVisible()
  await goToSeptember2026(page)
})

test('shows Airbnb inquiry and Direct request bars in a distinct request color', async ({ page }) => {
  const inquiryBar = page.getByTestId('calendar-booking-bar').filter({ hasText: 'נועה ברק' }).first()
  const requestBar = page.getByTestId('calendar-booking-bar').filter({ hasText: 'יואב מזרחי' }).first()

  await expect(inquiryBar).toBeVisible()
  await expect(requestBar).toBeVisible()
  await expect(inquiryBar).toHaveAttribute('data-booking-status', 'inquiry')
  await expect(requestBar).toHaveAttribute('data-booking-status', 'request')
  await expect(inquiryBar).toContainText('בקשה ·')
  await expect(requestBar).toContainText('בקשה ·')

  await expect(inquiryBar).toHaveCSS('color', 'rgb(146, 64, 14)')
  await expect(requestBar).toHaveCSS('color', 'rgb(146, 64, 14)')

  await expect(page.getByTestId('calendar-pricing-panel').getByText('בקשת הזמנה', { exact: true })).toBeVisible()
})

test('Airbnb inquiry details point the host to approve on the channel', async ({ page }) => {
  await page.getByTestId('calendar-booking-bar').filter({ hasText: 'נועה ברק' }).first().click()

  const details = page.getByTestId('calendar-reservation-details')
  await expect(details).toBeVisible()
  await expect(details.getByText('פרטי בקשת הזמנה')).toBeVisible()
  await expect(details).toContainText('בירור')
  await expect(page.getByTestId('calendar-approve-request')).toHaveCount(0)

  const channelLink = page.getByTestId('calendar-channel-link')
  await expect(channelLink).toBeVisible()
  await expect(channelLink).toHaveText('אשר באיירבנב')
  await expect(channelLink).toHaveAttribute(
    'href',
    'https://www.airbnb.com/hosting/reservations/details/HMTESTREQUEST',
  )
})

test('Direct request can be approved in the app and then renders as a confirmed booking', async ({ page }) => {
  await page.route('**/api/dashboard/bookings', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, demo: true }),
      })
      return
    }
    await route.continue()
  })

  await page.getByTestId('calendar-booking-bar').filter({ hasText: 'יואב מזרחי' }).first().click()

  const approve = page.getByTestId('calendar-approve-request')
  await expect(approve).toBeVisible()
  await approve.click()

  await expect(page.getByText('בקשת ההזמנה אושרה (מצב דמו)')).toBeVisible()

  const requestBar = page.getByTestId('calendar-booking-bar').filter({ hasText: 'יואב מזרחי' })
  await expect(requestBar).toHaveAttribute('data-booking-status', 'confirmed')
  await expect(requestBar).not.toContainText('בקשה ·')
  await expect(requestBar).toHaveCSS('color', 'rgb(6, 95, 70)')
})
