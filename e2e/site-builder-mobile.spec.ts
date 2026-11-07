import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

async function openSiteBuilder(page: Page, context: BrowserContext, baseURL: string) {
  await signInAsDemoUser(context, baseURL)

  await page.route('**/api/dashboard/arrival-message-skip**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: null }),
    })
  })

  await page.goto(`${baseURL}/dashboard/site-builder`)
  await page.waitForLoadState('networkidle')
}

test.describe('Site Builder Mobile Responsiveness (HOS-34)', () => {
  test('renders mobile tab switcher, fits within 375px viewport with no overflow, and allows browsing preview', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await openSiteBuilder(page, context, baseURL!)

    // 1. Verify zero horizontal overflow on mobile
    const overflowInfo = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth
      const scrollWidth = document.documentElement.scrollWidth
      return { docWidth, scrollWidth, hasOverflow: scrollWidth > docWidth }
    })
    expect(overflowInfo.hasOverflow).toBe(false)
    expect(overflowInfo.scrollWidth).toBeLessThanOrEqual(overflowInfo.docWidth)

    // 2. Mobile tab switcher is visible
    const editTabBtn = page.getByRole('button', { name: 'עריכת האתר' })
    const previewTabBtn = page.getByRole('button', { name: 'תצוגה מקדימה' })
    await expect(editTabBtn).toBeVisible()
    await expect(previewTabBtn).toBeVisible()

    // 3. In edit mode: WizardPanel is visible, LivePreview is hidden
    const wizardHeader = page.getByRole('heading', { name: 'אתר משלכם, בלי עמלות ערוצים' })
    await expect(wizardHeader).toBeVisible()

    // Stepper is visible and properly sized
    const step1Btn = page.getByRole('button', { name: /בחירת תבנית/ })
    await expect(step1Btn).toBeVisible()

    // Bottom nav from DashboardHeader is present on mobile
    const bottomNav = page.locator('.hostly-bottom-nav')
    await expect(bottomNav).toBeVisible()

    // Take artifact screenshot of mobile edit mode
    await page.screenshot({ path: '/opt/cursor/artifacts/site_builder_mobile_editor.png' })

    // 4. Switch to preview mode on mobile
    await previewTabBtn.click()

    // In preview mode: LivePreview is visible
    const livePreviewSection = page.getByLabel('תצוגה חיה')
    await expect(livePreviewSection).toBeVisible()

    // The browser frame is visible with the site host
    await expect(page.getByText('your-site.hostly.co.il')).toBeVisible()

    // The site content inside preview is rendered and browseable
    const previewSiteTitle = page.locator('main, div').getByText('החופשה המושלמת מתחילה כאן').first()
    await expect(previewSiteTitle).toBeVisible()

    // Verify no horizontal overflow in preview mode
    const previewOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth
      const scrollWidth = document.documentElement.scrollWidth
      return { docWidth, scrollWidth, hasOverflow: scrollWidth > docWidth }
    })
    expect(previewOverflow.hasOverflow).toBe(false)

    // Take artifact screenshot of mobile live preview
    await page.screenshot({ path: '/opt/cursor/artifacts/site_builder_mobile_preview.png' })

    // 5. Test switching back to edit mode via "עריכת שלבים" button in toolbar
    const editStepsBtn = page.getByRole('button', { name: 'עריכת שלבים' })
    await expect(editStepsBtn).toBeVisible()
    await editStepsBtn.click()

    await expect(wizardHeader).toBeVisible()

    // 6. Test full screen preview on mobile
    await previewTabBtn.click()
    const fullScreenBtn = livePreviewSection.getByRole('button', { name: /מסך מלא|תצוגה מקדימה/ })
    await fullScreenBtn.click()

    const fullScreenDialog = page.getByRole('dialog', { name: 'תצוגה מקדימה' })
    await expect(fullScreenDialog).toBeVisible()
    await page.screenshot({ path: '/opt/cursor/artifacts/site_builder_mobile_fullscreen.png' })

    const closeBtn = fullScreenDialog.getByRole('button', { name: 'סגירה' })
    await closeBtn.click()
    await expect(fullScreenDialog).toBeHidden()
  })

  test('navigates through all 4 wizard steps on 375px mobile without horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await openSiteBuilder(page, context, baseURL!)

    const nextBtn = page.getByRole('button', { name: 'הבא' })

    // Step 1: Template
    const templateStep = page.getByRole('button', { name: /בחירת תבנית/ })
    await expect(templateStep).toBeVisible()

    // Go to Step 2: Import
    await nextBtn.click()
    const importBtn = page.getByRole('button', { name: 'ייבוא בלחיצה אחת' })
    await expect(importBtn).toBeVisible()

    let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)

    // Go to Step 3: Customize
    await nextBtn.click()
    const contentFormInput = page.getByLabel('שם האתר')
    await expect(contentFormInput).toBeVisible()

    // Test typing on mobile
    await contentFormInput.fill('צימר נוף גלילי')
    await expect(contentFormInput).toHaveValue('צימר נוף גלילי')

    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)

    // Go to Step 4: Publish
    await nextBtn.click()
    const siteAddressInput = page.getByPlaceholder('nof-harim-dafna')
    await expect(siteAddressInput).toBeVisible()

    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)

    // Switch to preview to confirm edited site title is reflected on mobile
    const previewTabBtn = page.getByRole('button', { name: 'תצוגה מקדימה' })
    await previewTabBtn.click()

    await expect(page.locator('main, div').getByText('צימר נוף גלילי').first()).toBeVisible()
  })

  test('renders side-by-side desktop layout on 1280px viewport', async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await openSiteBuilder(page, context, baseURL!)

    // Mobile tab switcher should be hidden on desktop
    const editTabBtn = page.getByRole('button', { name: 'עריכת האתר' })
    await expect(editTabBtn).toBeHidden()

    // Both WizardPanel and LivePreview are visible simultaneously
    const wizardHeader = page.getByRole('heading', { name: 'אתר משלכם, בלי עמלות ערוצים' })
    await expect(wizardHeader).toBeVisible()

    const livePreviewSection = page.getByLabel('תצוגה חיה')
    await expect(livePreviewSection).toBeVisible()

    // Desktop sidebar is visible
    const sidebar = page.locator('.hostly-sidebar')
    await expect(sidebar).toBeVisible()

    // Mobile bottom nav is hidden
    const bottomNav = page.locator('.hostly-bottom-nav')
    await expect(bottomNav).toBeHidden()

    // Take artifact screenshot of desktop view
    await page.screenshot({ path: '/opt/cursor/artifacts/site_builder_desktop_view.png' })
  })
})
