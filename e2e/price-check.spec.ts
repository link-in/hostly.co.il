import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { E2E_DEMO_USER } from './constants'
import { signInAsUser } from './helpers/session'

const OWNER = { ...E2E_DEMO_USER, isDemo: false }

async function setupMocks(page: Page) {
  await page.route('**/api/dashboard/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'active',
        planId: 'pro',
        billingCycle: 'monthly',
        daysRemaining: 30,
        expiresAt: null,
      }),
    })
  })

  await page.route('**/api/dashboard/price-check', async (route) => {
    const postData = route.request().postDataJSON()
    if (postData?.checkIn === '2026-12-01') {
      // Simulate unavailable dates
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: false,
          price: 0,
          currency: 'ILS',
          nights: 2,
          pricePerNight: 0,
          checkIn: postData.checkIn,
          checkOut: postData.checkOut,
          numAdult: postData.numAdult,
          numChild: postData.numChild,
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        available: true,
        price: 1000,
        currency: 'ILS',
        nights: 2,
        pricePerNight: 500,
        checkIn: postData?.checkIn || '2026-06-01',
        checkOut: postData?.checkOut || '2026-06-03',
        numAdult: postData?.numAdult || 2,
        numChild: postData?.numChild || 0,
      }),
    })
  })

  await page.route('**/api/dashboard/price-check/channel-urls**', async (route) => {
    if (route.request().method() === 'POST') {
      const postData = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, urls: postData }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        urls: {
          airbnb: '12345',
          booking: 'demo-hotel',
          direct: 'demo-site',
        },
        propertyName: 'נוף הרים בדפנה',
        isAutoDetected: { airbnb: true, booking: true, direct: true },
      }),
    })
  })

  await page.route('**/api/dashboard/price-check/online**', async (route) => {
    const postData = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkIn: postData?.checkIn || '2026-06-01',
        checkOut: postData?.checkOut || '2026-06-03',
        numAdult: postData?.numAdult || 2,
        numChild: postData?.numChild || 0,
        nights: 2,
        basePrice: 1000,
        channels: [
          {
            channelKey: 'airbnb',
            name: 'Airbnb',
            url: `https://www.airbnb.co.il/rooms/12345?check_in=${postData?.checkIn || '2026-06-01'}&check_out=${postData?.checkOut || '2026-06-03'}&adults=2`,
            status: 'success',
            statusMessage: 'המחיר נסרק בהצלחה מאתר ההזמנות',
            hostlyPrice: 1210,
            beds24Price: 1210,
            onlinePrice: 1210,
            currency: 'ILS',
            diff: 0,
            diffPercent: 0,
            matchStatus: 'matched',
            matchMessage: 'תואם במדויק',
            fetchedAt: new Date().toISOString(),
          },
          {
            channelKey: 'booking',
            name: 'Booking.com',
            url: `https://www.booking.com/hotel/il/demo.html?checkin=${postData?.checkIn || '2026-06-01'}&checkout=${postData?.checkOut || '2026-06-03'}&group_adults=2`,
            status: 'success',
            statusMessage: 'המחיר נסרק בהצלחה מאתר ההזמנות',
            hostlyPrice: 1210,
            beds24Price: 1210,
            onlinePrice: 1210,
            currency: 'ILS',
            diff: 0,
            diffPercent: 0,
            matchStatus: 'matched',
            matchMessage: 'תואם במדויק',
            fetchedAt: new Date().toISOString(),
          },
          {
            channelKey: 'direct',
            name: 'אתר הזמנות ישיר',
            url: `https://example.com/sites/demo?checkIn=${postData?.checkIn || '2026-06-01'}&checkOut=${postData?.checkOut || '2026-06-03'}&adults=2`,
            status: 'success',
            statusMessage: 'המחיר נסרק בהצלחה מאתר ההזמנות הישיר',
            hostlyPrice: 1000,
            beds24Price: 1000,
            onlinePrice: 1000,
            currency: 'ILS',
            diff: 0,
            diffPercent: 0,
            matchStatus: 'matched',
            matchMessage: 'תואם במדויק',
            fetchedAt: new Date().toISOString(),
          },
        ],
      }),
    })
  })
}

test.describe('Price Check Page (HOS-30 / HOS-35)', () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    await signInAsUser(context, baseURL!, OWNER)
    await setupMocks(page)
    await page.goto('/dashboard/price-check')
    await expect(page.getByRole('heading', { name: 'בדיקת מחיר וזמינות' })).toBeVisible()
  })

  test('renders page with clean Hostly design system layout and page header', async ({ page }) => {
    await expect(page.getByTestId('price-check-page')).toBeVisible()
    await expect(page.getByTestId('price-check-form-card')).toBeVisible()

    // No old purple background gradients on the page shell
    const mainBg = await page.getByTestId('price-check-page').evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage
    })
    expect(mainBg).toBe('none')

    // Dates inputs exist
    await expect(page.getByTestId('check-in-input')).toBeVisible()
    await expect(page.getByTestId('check-out-input')).toBeVisible()

    // Number stepper fields exist
    await expect(page.getByTestId('adults-input')).toBeVisible()
    await expect(page.getByTestId('adults-decrement')).toBeVisible()
    await expect(page.getByTestId('adults-increment')).toBeVisible()

    await expect(page.getByTestId('children-input')).toBeVisible()
    await expect(page.getByTestId('children-decrement')).toBeVisible()
    await expect(page.getByTestId('children-increment')).toBeVisible()

    await page.screenshot({ path: '/opt/cursor/artifacts/price_check_form.png', fullPage: true })
  })

  test('number stepper handles increment, decrement, and direct typing', async ({ page }) => {
    const adultsInput = page.getByTestId('adults-input')
    const adultsInc = page.getByTestId('adults-increment')
    const adultsDec = page.getByTestId('adults-decrement')

    // Starts at 2
    await expect(adultsInput).toHaveValue('2')

    // Increment to 3
    await adultsInc.click()
    await expect(adultsInput).toHaveValue('3')

    // Decrement to 2
    await adultsDec.click()
    await expect(adultsInput).toHaveValue('2')

    // Direct typing
    await adultsInput.click()
    await adultsInput.fill('')
    await adultsInput.fill('4')
    await adultsInput.blur()
    await expect(adultsInput).toHaveValue('4')

    // Children cannot decrement below 0
    const childrenInput = page.getByTestId('children-input')
    const childrenDec = page.getByTestId('children-decrement')
    await expect(childrenInput).toHaveValue('0')
    await expect(childrenDec).toBeDisabled()
  })

  test('submits price check and renders available results with channel comparison (1.21 multiplier)', async ({
    page,
  }) => {
    const submitBtn = page.getByTestId('price-check-submit-btn')
    await submitBtn.click()

    // Results card becomes visible
    await expect(page.getByTestId('price-check-result-available')).toBeVisible()
    await expect(page.getByTestId('availability-badge-success')).toContainText('זמין להזמנה')
    await expect(page.getByTestId('result-total-price')).toContainText('1,000')

    // Channel prices: Airbnb and Booking use 1.21 multiplier (1210 ILS)
    const airbnbCard = page.getByTestId('channel-airbnb')
    await expect(airbnbCard).toBeVisible()
    await expect(airbnbCard).toContainText('Airbnb')
    await expect(airbnbCard).toContainText('+21%')
    await expect(airbnbCard).toContainText('1,210')

    const bookingCard = page.getByTestId('channel-booking')
    await expect(bookingCard).toBeVisible()
    await expect(bookingCard).toContainText('Booking.com')
    await expect(bookingCard).toContainText('+21%')
    await expect(bookingCard).toContainText('1,210')

    const directCard = page.getByTestId('channel-direct')
    await expect(directCard).toBeVisible()
    await expect(directCard).toContainText('הזמנה ישירה')
    await expect(directCard).toContainText('1,000')

    await page.screenshot({ path: '/opt/cursor/artifacts/price_check_results_available.png', fullPage: true })
  })

  test('renders multi-channel online comparison table with Hostly, Beds24, and Online prices (HOS-35)', async ({
    page,
  }) => {
    const submitBtn = page.getByTestId('price-check-submit-btn')
    await submitBtn.click()

    // Comparison table becomes visible
    await expect(page.getByTestId('price-comparison-table-card')).toBeVisible()
    await expect(page.getByTestId('price-comparison-table')).toBeVisible()

    // Rows for all 3 channels
    await expect(page.getByTestId('table-row-airbnb')).toBeVisible()
    await expect(page.getByTestId('table-row-booking')).toBeVisible()
    await expect(page.getByTestId('table-row-direct')).toBeVisible()

    // Hostly, Beds24 and Online price columns
    await expect(page.getByTestId('hostly-price-airbnb')).toContainText('1,210')
    await expect(page.getByTestId('beds24-price-airbnb')).toContainText('1,210')
    await expect(page.getByTestId('online-price-airbnb')).toContainText('1,210')

    await expect(page.getByTestId('hostly-price-booking')).toContainText('1,210')
    await expect(page.getByTestId('beds24-price-booking')).toContainText('1,210')
    await expect(page.getByTestId('online-price-booking')).toContainText('1,210')

    await expect(page.getByTestId('hostly-price-direct')).toContainText('1,000')
    await expect(page.getByTestId('beds24-price-direct')).toContainText('1,000')
    await expect(page.getByTestId('online-price-direct')).toContainText('1,000')

    // Match badges indicate exact match
    await expect(page.getByTestId('table-row-airbnb').getByTestId('match-badge-airbnb')).toContainText('תואם במדויק')
    await expect(page.getByTestId('table-row-booking').getByTestId('match-badge-booking')).toContainText('תואם במדויק')
    await expect(page.getByTestId('table-row-direct').getByTestId('match-badge-direct')).toContainText('תואם במדויק')

    // Direct surf buttons are populated with parameterized URLs
    const airbnbLink = page.getByTestId('direct-link-airbnb')
    await expect(airbnbLink).toBeVisible()
    await expect(airbnbLink).toHaveAttribute('href', /check_in=/)

    const bookingLink = page.getByTestId('direct-link-booking')
    await expect(bookingLink).toBeVisible()
    await expect(bookingLink).toHaveAttribute('href', /checkin=/)

    await page.screenshot({ path: '/opt/cursor/artifacts/price_check_comparison_table.png', fullPage: true })
  })

  test('allows configuring channel URLs and saving them', async ({ page }) => {
    // Open settings
    const settingsBtn = page.getByRole('button', { name: /הגדרת קישורי ערוצים/ })
    await settingsBtn.click()

    await expect(page.getByTestId('channel-url-settings-card')).toBeVisible()

    // Inputs exist
    const airbnbInput = page.getByTestId('airbnb-url-input')
    const bookingInput = page.getByTestId('booking-url-input')
    const directInput = page.getByTestId('direct-url-input')

    await airbnbInput.fill('99887766')
    await bookingInput.fill('my-hotel-slug')
    await directInput.fill('my-direct-slug')

    // Save
    await page.getByTestId('save-urls-btn').click()

    // Settings card closes on save
    await expect(page.getByTestId('channel-url-settings-card')).not.toBeVisible()
  })

  test('renders mobile comparison cards on mobile viewport (HOS-35)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const submitBtn = page.getByTestId('price-check-submit-btn')
    await submitBtn.click()

    await expect(page.getByTestId('price-comparison-table-card')).toBeVisible()
    await expect(page.getByTestId('price-comparison-mobile-cards')).toBeVisible()
    await expect(page.getByTestId('mobile-card-airbnb')).toBeVisible()
    await expect(page.getByTestId('mobile-card-booking')).toBeVisible()
    await expect(page.getByTestId('mobile-card-direct')).toBeVisible()
    await expect(page.getByTestId('mobile-direct-link-airbnb')).toBeVisible()

    await page.screenshot({ path: '/opt/cursor/artifacts/price_check_mobile_cards.png', fullPage: true })
  })

  test('displays clean unavailable warning state when dates are blocked', async ({ page }) => {
    const checkInInput = page.getByTestId('check-in-input')
    const checkOutInput = page.getByTestId('check-out-input')

    await checkInInput.fill('2026-12-01')
    await checkOutInput.fill('2026-12-03')

    const submitBtn = page.getByTestId('price-check-submit-btn')
    await submitBtn.click()

    await expect(page.getByTestId('price-check-result-unavailable')).toBeVisible()
    await expect(page.getByTestId('price-check-result-unavailable')).toContainText('התאריכים אינם זמינים')

    await page.screenshot({ path: '/opt/cursor/artifacts/price_check_results_unavailable.png', fullPage: true })
  })
})
