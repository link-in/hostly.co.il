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

  await page.route('**/api/dashboard/review-reminder-settings', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          settings: route.request().postDataJSON(),
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          googleReviewUrl: 'https://g.page/r/demo',
          reviewMessageText: 'תודה מיוחדת שהתארחתם ב{propertyName}!',
        }),
      })
    }
  })
}

test.describe('WhatsApp Messages Page Tabs & Mobile Experience', () => {
  test('renders segmented control tabs with icons without emojis, and switches sections smoothly', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAsDemoUser(context, baseURL!)
    await setupPageRoutes(page)

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${baseURL}/dashboard/messages`)
    await page.waitForLoadState('networkidle')

    // Page title
    await expect(page.getByRole('heading', { name: 'הודעות WhatsApp' })).toBeVisible()

    // Tab buttons
    const tabArrival = page.getByRole('tab', { name: /הודעת יום הגעה/ })
    const tabReview = page.getByRole('tab', { name: /הודעת ביקורת/ })
    const tabLogs = page.getByRole('tab', { name: /יומן שליחות/ })

    await expect(tabArrival).toBeVisible()
    await expect(tabReview).toBeVisible()
    await expect(tabLogs).toBeVisible()

    // 1. Initial tab: arrival message is active
    await expect(tabArrival).toHaveAttribute('aria-selected', 'true')
    const arrivalTitle = page.locator('#arrival-message-title')
    await expect(arrivalTitle).toBeVisible()
    await expect(page.locator('#review-reminder-title')).toHaveCount(0)
    await expect(page.locator('#dispatch-log-title')).toHaveCount(0)

    // Capture desktop tab screenshot
    await page.screenshot({
      path: '/opt/cursor/artifacts/whatsapp_messages_tab_arrival_desktop.png',
      fullPage: true,
    })

    // 2. Switch to review reminder tab
    await tabReview.click()
    await expect(tabReview).toHaveAttribute('aria-selected', 'true')
    await expect(tabArrival).toHaveAttribute('aria-selected', 'false')

    const reviewTitle = page.locator('#review-reminder-title')
    await expect(reviewTitle).toBeVisible()
    await expect(arrivalTitle).toHaveCount(0)
    await expect(page.locator('#dispatch-log-title')).toHaveCount(0)

    // Capture review tab screenshot
    await page.screenshot({
      path: '/opt/cursor/artifacts/whatsapp_messages_tab_review_desktop.png',
      fullPage: true,
    })

    // 3. Switch to dispatch log tab
    await tabLogs.click()
    await expect(tabLogs).toHaveAttribute('aria-selected', 'true')

    const logTitle = page.locator('#dispatch-log-title')
    await expect(logTitle).toBeVisible()
    await expect(page.getByText('הודעות', { exact: true })).toBeVisible()
    await expect(page.getByText('נשלחו', { exact: true })).toBeVisible()
    await expect(page.getByText('נכשלו / חלקי', { exact: true })).toBeVisible()

    // Capture logs tab screenshot
    await page.screenshot({
      path: '/opt/cursor/artifacts/whatsapp_messages_tab_logs_desktop.png',
      fullPage: true,
    })
  })

  test('renders clean and compact tabs on mobile viewport without breaking or horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAsDemoUser(context, baseURL!)
    await setupPageRoutes(page)

    // Mobile viewport (iPhone 13 / 14 width)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${baseURL}/dashboard/messages`)
    await page.waitForLoadState('networkidle')

    // On mobile, compact labels are visible
    const tabArrival = page.getByRole('tab', { name: /יום הגעה/ })
    const tabReview = page.getByRole('tab', { name: /ביקורת/ })
    const tabLogs = page.getByRole('tab', { name: /יומן/ })

    await expect(tabArrival).toBeVisible()
    await expect(tabReview).toBeVisible()
    await expect(tabLogs).toBeVisible()

    // Capture mobile tabs screenshot
    await page.screenshot({
      path: '/opt/cursor/artifacts/whatsapp_messages_tabs_mobile.png',
      fullPage: true,
    })

    // Switch to logs on mobile
    await tabLogs.click()
    await expect(page.locator('#dispatch-log-title')).toBeVisible()

    // Capture mobile logs screenshot
    await page.screenshot({
      path: '/opt/cursor/artifacts/whatsapp_messages_logs_mobile.png',
      fullPage: true,
    })
  })

  test('supports direct tab linking via ?tab= parameter and redirects from old arrival route', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAsDemoUser(context, baseURL!)
    await setupPageRoutes(page)

    // Direct url with tab=logs
    await page.goto(`${baseURL}/dashboard/messages?tab=logs`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#dispatch-log-title')).toBeVisible()

    // Redirect from old arrival page
    await page.goto(`${baseURL}/dashboard/arrival-message`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/dashboard/messages')
    await expect(page.locator('#arrival-message-title')).toBeVisible()
  })

  test('allows editing and saving review reminder message text and loading default template', async ({
    page,
    context,
    baseURL,
  }) => {
    let currentSettings = {
      googleReviewUrl: 'https://g.page/r/demo',
      reviewMessageText: 'תודה מיוחדת שהתארחתם ב{propertyName}!',
    }
    await signInAsDemoUser(context, baseURL!)
    await setupPageRoutes(page)

    await page.route('**/api/dashboard/review-reminder-settings', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        currentSettings = { ...currentSettings, ...body }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            settings: currentSettings,
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(currentSettings),
        })
      }
    })

    await page.goto(`${baseURL}/dashboard/messages?tab=review`)
    await page.waitForLoadState('networkidle')

    const messageTextarea = page.locator('textarea')
    await expect(messageTextarea).toBeVisible()
    await expect(messageTextarea).toHaveValue('תודה מיוחדת שהתארחתם ב{propertyName}!')

    // Click "טען נוסח ברירת מחדל לעריכה"
    const loadDefaultBtn = page.getByRole('button', { name: 'טען נוסח ברירת מחדל לעריכה' })
    await expect(loadDefaultBtn).toBeVisible()
    await loadDefaultBtn.click()

    await expect(messageTextarea).toHaveValue(/מקווים שנהניתם ושהרגשתם בבית/)

    // Edit text
    await messageTextarea.fill('נוסח ביקורת חדש מותאם אישית!')

    // Save
    const saveResponsePromise = page.waitForResponse('**/api/dashboard/review-reminder-settings')
    const saveBtn = page.getByRole('button', { name: 'שמור הגדרות' })
    await saveBtn.click()
    await saveResponsePromise

    await expect(page.getByText('ההגדרות נשמרו בהצלחה')).toBeVisible()
    expect(currentSettings).toMatchObject({
      reviewMessageText: 'נוסח ביקורת חדש מותאם אישית!',
      googleReviewUrl: 'https://g.page/r/demo',
    })

    await page.screenshot({
      path: '/opt/cursor/artifacts/whatsapp_messages_tab_review_custom_text.png',
      fullPage: true,
    })
  })
})
