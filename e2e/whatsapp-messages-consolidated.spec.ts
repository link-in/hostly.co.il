import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

async function setupPageRoutes(page: Page) {
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

  await page.route('**/api/dashboard/whatsapp-messages**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            id: 'log-1',
            user_id: 'demo-user',
            booking_id: 'BK-101',
            message_type: 'arrival_day_guest',
            recipient_role: 'guest',
            recipient_name: 'ישראל ישראלי',
            recipient_phone: '0501234567',
            status: 'sent',
            error: null,
            provider: 'whapi',
            provider_message_id: 'msg-abc',
            message_body: 'בוקר טוב ישראל, הנה פרטי ההגעה לבית',
            created_at: new Date().toISOString(),
          },
          {
            id: 'log-2',
            user_id: 'demo-user',
            booking_id: 'BK-102',
            message_type: 'review_reminder_guest',
            recipient_role: 'guest',
            recipient_name: 'שרה כהן',
            recipient_phone: '0529876543',
            status: 'sent',
            error: null,
            provider: 'whapi',
            provider_message_id: 'msg-def',
            message_body: 'שלום שרה, נשמח אם תדרגי אותנו בגוגל',
            created_at: new Date().toISOString(),
          },
        ],
        total: 2,
      }),
    })
  })

  await page.route('**/api/dashboard/arrival-message-skip**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: null }),
    })
  })
}

test.describe('WhatsApp Messages Page Consolidation (HOS-22)', () => {
  test('renders all 3 sections in the exact required vertical order: arrival message, then review reminder, then dispatch log', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAsDemoUser(context, baseURL!)
    await setupPageRoutes(page)

    await page.setViewportSize({ width: 1280, height: 1200 })
    await page.goto(`${baseURL}/dashboard/messages`)
    await page.waitForLoadState('networkidle')

    // Page title
    await expect(page.getByRole('heading', { name: 'הודעות WhatsApp' })).toBeVisible()

    // 1. First section: הודעת יום הגעה
    const arrivalTitle = page.locator('#arrival-message-title')
    await expect(arrivalTitle).toBeVisible()
    await expect(arrivalTitle).toHaveText('הודעת יום הגעה')

    const saveArrivalBtn = page.getByRole('button', { name: 'שמור הגדרות' })
    const testSendArrivalBtn = page.getByRole('button', { name: 'שלח לי הודעת בדיקה' })
    await expect(saveArrivalBtn).toBeVisible()
    await expect(testSendArrivalBtn).toBeVisible()

    // 2. Second section: הודעת ביקורת אחרי צ'ק-אאוט
    const reviewTitle = page.locator('#review-reminder-title')
    await expect(reviewTitle).toBeVisible()
    await expect(reviewTitle).toHaveText("הודעת ביקורת אחרי צ'ק-אאוט")

    const saveReviewBtn = page.getByRole('button', { name: 'שמור קישור ביקורת' })
    const testSendReviewBtn = page.getByRole('button', { name: 'שלח הודעת בדיקה למספר שלי' })
    const liveSendReviewBtn = page.getByRole('button', { name: 'הפעל שליחה עבור אתמול (מול הזמנות אמיתיות)' })
    await expect(saveReviewBtn).toBeVisible()
    await expect(testSendReviewBtn).toBeVisible()
    await expect(liveSendReviewBtn).toBeVisible()

    // 3. Third section: יומן שליחות
    const dispatchLogTitle = page.locator('#dispatch-log-title')
    await expect(dispatchLogTitle).toBeVisible()
    await expect(dispatchLogTitle).toHaveText('יומן שליחות')

    // Verify stats in dispatch log
    await expect(page.getByText('הודעות', { exact: true })).toBeVisible()
    await expect(page.getByText('נשלחו', { exact: true })).toBeVisible()
    await expect(page.getByText('נכשלו / חלקי', { exact: true })).toBeVisible()

    // Verify vertical order (arrival < review < log)
    const arrivalBox = await arrivalTitle.boundingBox()
    const reviewBox = await reviewTitle.boundingBox()
    const logBox = await dispatchLogTitle.boundingBox()

    expect(arrivalBox).not.toBeNull()
    expect(reviewBox).not.toBeNull()
    expect(logBox).not.toBeNull()

    expect(arrivalBox!.y).toBeLessThan(reviewBox!.y)
    expect(reviewBox!.y).toBeLessThan(logBox!.y)

    // Save walkthrough artifact screenshot
    await page.screenshot({
      path: '/opt/cursor/artifacts/whatsapp_messages_consolidated.png',
      fullPage: true,
    })
  })

  test('redirects from /dashboard/arrival-message to /dashboard/messages', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAsDemoUser(context, baseURL!)
    await setupPageRoutes(page)

    await page.goto(`${baseURL}/dashboard/arrival-message`)
    await page.waitForLoadState('networkidle')

    // Should have redirected to /dashboard/messages
    expect(page.url()).toContain('/dashboard/messages')
    await expect(page.locator('#arrival-message-title')).toBeVisible()
  })

  test('navigation menu shows only unified WhatsApp messages and hides old arrival-message item', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAsDemoUser(context, baseURL!)
    await setupPageRoutes(page)

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`${baseURL}/dashboard`)
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('.hostly-sidebar')
    await expect(sidebar.getByRole('link', { name: 'הודעות WhatsApp' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'הודעת יום הגעה' })).toHaveCount(0)
  })
})
