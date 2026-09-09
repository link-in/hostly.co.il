import { test, expect } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { signInAsDemoUser } from './helpers/session'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'

/**
 * HOS-8: the call icon in the reservations list used leftover pink (#f093fb)
 * instead of brand purple (#7133D9). Expand a demo booking that has a phone
 * number and assert the circular call button matches the dashboard accent.
 */
test.describe('reservation call icon color', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('uses brand purple for the call button next to WhatsApp', async ({ page, context, baseURL }) => {
    await signInAsDemoUser(context, baseURL!)

    await page.route('**/api/dashboard/arrival-message-skip**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: null }),
      })
    })

    await page.goto('/dashboard?room=DEMO_ROOM_002')

    const guestHeading = page.getByRole('heading', { name: 'מור אלמוג' })
    await expect(guestHeading).toBeVisible()
    await guestHeading.click()

    const callButton = page.getByTestId('reservation-call-button').first()
    await expect(callButton).toBeVisible()
    await expect(callButton).toHaveCSS('background-color', 'rgb(113, 51, 217)')

    const whatsappButton = page.getByRole('link', { name: /וואטסאפ/ }).first()
    await expect(whatsappButton).toBeVisible()
    await expect(whatsappButton).toHaveCSS('background-color', 'rgb(37, 211, 102)')

    if (existsSync('/opt/cursor') || existsSync(ARTIFACTS_DIR)) {
      try {
        mkdirSync(ARTIFACTS_DIR, { recursive: true })
        await page.locator('.reservation-list-item.expanded').first().screenshot({
          path: `${ARTIFACTS_DIR}/reservation_call_icon_after.png`,
        })
      } catch {
        // Artifacts mount may be unavailable in some environments
      }
    }
  })
})
