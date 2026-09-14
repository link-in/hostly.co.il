import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

/**
 * HOS-12: digital check-in is temporarily hidden from the dashboard menu
 * (sidebar on desktop, more-drawer on mobile). The page itself is not removed.
 */

async function openDashboard(page: Page, context: BrowserContext, baseURL: string) {
  await signInAsDemoUser(context, baseURL)

  await page.route('**/api/dashboard/arrival-message-skip**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: null }),
    })
  })

  await page.goto('/dashboard')
}

test.describe('desktop sidebar hides digital check-in', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('does not show the digital check-in link in the sidebar', async ({ page, context, baseURL }) => {
    await openDashboard(page, context, baseURL!)

    const sidebar = page.locator('.hostly-sidebar')
    await expect(sidebar.getByRole('link', { name: 'כל ההזמנות' })).toBeVisible()
    await expect(page.getByRole('link', { name: "צ'ק-אין דיגיטלי" })).toHaveCount(0)
  })
})

test.describe('mobile drawer hides digital check-in', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('does not show the digital check-in link in the more menu', async ({ page, context, baseURL }) => {
    await openDashboard(page, context, baseURL!)

    await page.getByRole('button', { name: 'עוד תפריט' }).click()
    const drawer = page.getByRole('dialog', { name: 'תפריט ניווט' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('link', { name: 'כל ההזמנות' })).toHaveCSS('opacity', '1')
    await expect(drawer.getByRole('link', { name: "צ'ק-אין דיגיטלי" })).toHaveCount(0)
  })
})
