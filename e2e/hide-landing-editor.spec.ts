import { test, expect } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

/**
 * HOS-17: the landing-page editor is hidden from the dashboard until we
 * re-enable it. Direct visits to `/dashboard/landing` redirect home to the
 * calendar, and the nav item is gone from both the desktop sidebar and the
 * mobile "more" drawer.
 */

test.describe('landing editor hidden on desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('does not list ניהול דף נחיתה in the sidebar', async ({ page, context, baseURL }) => {
    await signInAsDemoUser(context, baseURL!)
    await page.goto('/dashboard')

    const sidebar = page.getByRole('navigation', { name: 'תפריט ניווט' })
    await expect(sidebar.getByText('מפתחות API')).toBeVisible()
    await expect(sidebar.getByText('ניהול דף נחיתה')).toHaveCount(0)
  })

  test('redirects /dashboard/landing to the dashboard', async ({ page, context, baseURL }) => {
    await signInAsDemoUser(context, baseURL!)
    await page.goto('/dashboard/landing')
    await expect(page).toHaveURL(/\/dashboard\/?$/)
    await expect(page.getByText('ניהול דף נחיתה')).toHaveCount(0)
  })
})

test.describe('landing editor hidden on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('does not list ניהול דף נחיתה in the more menu', async ({ page, context, baseURL }) => {
    await signInAsDemoUser(context, baseURL!)
    await page.goto('/dashboard')

    await page.getByRole('button', { name: 'עוד תפריט' }).click()

    const drawer = page.getByRole('dialog', { name: 'תפריט ניווט' })
    await expect(drawer.getByText('מפתחות API')).toBeVisible()
    await expect(drawer.getByText('ניהול דף נחיתה')).toHaveCount(0)
  })
})
