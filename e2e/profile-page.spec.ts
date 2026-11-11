import { test, expect, type Page } from '@playwright/test'
import { E2E_DEMO_USER } from './constants'
import { signInAsUser } from './helpers/session'

/**
 * אזור אישי: עמוד מחולק למקטעים (כרטיסים) עם ניווט צדדי, ושמירה דרך
 * סרגל דביק שמופיע רק כשיש שינויים. כל קריאות ה-API ממוקות.
 */

const OWNER = { ...E2E_DEMO_USER, isDemo: false, phoneNumber: '+972524892229' }

async function mockProfileApis(page: Page) {
  await page.route('**/api/dashboard/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'trial', planId: null, billingCycle: null, daysRemaining: 2, expiresAt: null }),
    })
  })
  await page.route('**/api/dashboard/receipts/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ provider: 'icount', hasApiToken: false, isActive: true, defaultVatId: '' }),
    })
  })
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await signInAsUser(context, baseURL!, OWNER)
  await mockProfileApis(page)
  await page.goto('/dashboard/profile')
  await expect(page.getByRole('heading', { name: 'פרטים אישיים' })).toBeVisible()
})

test('splits the page into separate section cards with a section nav', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'מקטעי האזור האישי' })
  await expect(nav).toBeVisible()

  for (const title of ['פרטים אישיים', 'התראות', "צ'ק-אין דיגיטלי", 'קבלות וחשבוניות', 'אבטחה', 'מנוי']) {
    await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible()
  }
  await expect(nav.getByRole('link')).toHaveCount(8)
})

test('owner phone is editable in the personal details section', async ({ page }) => {
  const phone = page.locator('#details').getByLabel('טלפון (WhatsApp להתראות)')
  await expect(phone).toBeVisible()
  await expect(phone).toHaveValue('+972524892229')
})

test('clicking a nav item jumps to its section and marks it active', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'מקטעי האזור האישי' })
  await nav.getByRole('link', { name: 'אבטחה' }).click()

  await expect(nav.getByRole('link', { name: 'אבטחה' })).toHaveAttribute('aria-current', 'true')
  await expect(page.locator('#security')).toBeInViewport()
})

test('section nav stays pinned while scrolling (desktop)', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'מקטעי האזור האישי' })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800)

  await expect(nav).toBeInViewport({ ratio: 1 })
  const box = await nav.boundingBox()
  expect(box!.y).toBeLessThan(40)
})

test('save bar only appears when something changed and cancel restores the value', async ({ page }) => {
  const saveBar = page.getByRole('region', { name: 'שמירת שינויים' })
  await expect(saveBar).toHaveCount(0)

  const name = page.getByLabel('שם תצוגה')
  const original = await name.inputValue()
  await name.fill('שם חדש')
  await expect(saveBar).toBeVisible()

  await saveBar.getByRole('button', { name: 'ביטול' }).click()
  await expect(saveBar).toHaveCount(0)
  await expect(name).toHaveValue(original)
})

test('saving sends the trimmed payload and confirms success', async ({ page }) => {
  let body: Record<string, unknown> | null = null
  await page.route('**/api/auth/update-profile', async (route) => {
    body = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })

  await page.getByLabel('שם תצוגה').fill('  רותם  ')
  await page.getByLabel('שם רשת WiFi (SSID)').fill('Hostly')
  await page.getByRole('button', { name: 'שמירת שינויים' }).click()

  await expect(page.getByText('הפרטים נשמרו בהצלחה')).toBeVisible()
  expect(body).toMatchObject({ displayName: 'רותם', checkInSettings: { wifi_ssid: 'Hostly' } })
  expect(body).not.toHaveProperty('newPassword')
  await expect(page.getByRole('region', { name: 'שמירת שינויים' })).toHaveCount(0)
})

test('validates a password change before calling the server', async ({ page }) => {
  let called = false
  await page.route('**/api/auth/update-profile', async (route) => {
    called = true
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.getByLabel('שם תצוגה').fill('רותם')
  await page.getByLabel('סיסמה נוכחית').fill('old-pass')
  await page.getByLabel('סיסמה חדשה', { exact: true }).fill('abcdef')
  await page.getByLabel('אימות סיסמה חדשה').fill('abcxyz')
  await page.getByRole('button', { name: 'שמירת שינויים' }).click()

  await expect(page.getByRole('alert').filter({ hasText: 'הסיסמאות אינן תואמות' })).toBeVisible()
  expect(called).toBe(false)
})

test('shows trial subscription details with an upgrade action', async ({ page }) => {
  const section = page.locator('#subscription')
  await expect(section.getByText('ניסיון', { exact: true })).toBeVisible()
  await expect(section.getByText('2 ימים')).toBeVisible()
  await expect(section.getByRole('button', { name: 'שדרג עכשיו' })).toBeVisible()
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('chip bar stays pinned to the top while scrolling', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'מקטעי האזור האישי' })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800)

    await expect(nav).toBeInViewport({ ratio: 1 })
    expect((await nav.boundingBox())!.y).toBeLessThan(5)
  })

  test('nav becomes a horizontal chip bar and the save bar stays above the bottom nav', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'מקטעי האזור האישי' })
    const box = await nav.boundingBox()
    expect(box?.width).toBeGreaterThan(300)
    expect(box?.height).toBeLessThan(80)

    await page.getByLabel('שם תצוגה').fill('שם חדש')
    const saveBar = page.getByRole('region', { name: 'שמירת שינויים' })
    await expect(saveBar).toBeInViewport()

    const barBox = await saveBar.boundingBox()
    expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(844 - 60)
  })
})
