import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

async function openArrivalMessagePage(page: Page, context: BrowserContext, baseURL: string) {
  await signInAsDemoUser(context, baseURL)

  await page.route('**/api/dashboard/arrival-message-settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        enabled: true,
        photoUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
        photoStoragePath: 'demo-user/arrival/photo.jpg',
        introText: 'ברוכים הבאים לבית שלנו!',
        wazeLink: 'https://waze.com/ul?ll=32.8,35.5',
        houseRules: 'ללא עישון',
      }),
    })
  })

  await page.goto(`${baseURL}/dashboard/arrival-message`)
  await page.waitForLoadState('networkidle')
}

test.describe('Arrival Message Page Buttons (HOS-14)', () => {
  test('renders unified hostly-btn classes and matching brand purple styling', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await openArrivalMessagePage(page, context, baseURL!)

    // Verify main action buttons use Hostly Design System
    const saveButton = page.getByRole('button', { name: 'שמור הגדרות' })
    const testSendButton = page.getByRole('button', { name: 'שלח לי הודעת בדיקה' })
    const replacePhotoButton = page.getByRole('button', { name: 'החלף תמונה' })
    const removePhotoButton = page.getByRole('button', { name: 'הסר תמונה' })

    await expect(saveButton).toBeVisible()
    await expect(testSendButton).toBeVisible()
    await expect(replacePhotoButton).toBeVisible()
    await expect(removePhotoButton).toBeVisible()

    // None should have bootstrap btn-primary (which produces default blue #0d6efd)
    await expect(saveButton).not.toHaveClass(/(^|\s)btn-primary(\s|$)/)
    await expect(saveButton).toHaveClass(/(^|\s)hostly-btn-primary(\s|$)/)

    await expect(testSendButton).toHaveClass(/(^|\s)hostly-btn(\s|$)/)
    await expect(replacePhotoButton).toHaveClass(/(^|\s)hostly-btn(\s|$)/)
    await expect(removePhotoButton).toHaveClass(/(^|\s)hostly-btn-danger(\s|$)/)

    // Capture screenshot artifact for walkthrough
    await page.screenshot({ path: '/opt/cursor/artifacts/arrival_message_page_buttons.png', fullPage: true })
  })
})
