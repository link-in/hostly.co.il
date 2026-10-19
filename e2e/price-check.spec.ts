import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { E2E_DEMO_USER } from './constants'
import { signInAsUser } from './helpers/session'

const OWNER = { ...E2E_DEMO_USER, isDemo: false }

async function setupMocks(page: Page) {
  await page.route('**/api/dashboard/price-check**', async (route) => {
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
}

test.describe('Price Check Page (HOS-30)', () => {
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
