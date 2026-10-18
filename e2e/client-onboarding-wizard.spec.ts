import { test, expect, type Page, type Route } from '@playwright/test'
import { signInAsAdmin } from './helpers/session'

/**
 * Happy path for the unified client onboarding wizard. Every
 * `/api/admin/onboarding/<id>/*` call is answered by an in-memory fake that
 * mimics the real step state machine, so no Beds24 or Supabase call is made.
 */

const USER_ID = 'e2e-client-1'
const STEP_ORDER = ['property', 'basePrice', 'airbnbConnect', 'airbnbMultiplier', 'bookingCom', 'verifyChannels', 'finalize']

type StepRecord = { status: 'done' | 'skipped' | 'failed'; data?: Record<string, unknown>; updatedAt: string }

function createFakeOnboardingBackend() {
  const steps: Record<string, StepRecord> = {}
  let completedAt: string | null = null
  const requests: Array<{ path: string; body: unknown }> = []

  const done = (step: string, data: Record<string, unknown> = {}) => {
    steps[step] = { status: 'done', data, updatedAt: new Date().toISOString() }
    return { data, alreadyDone: false }
  }

  const overview = () => ({
    client: {
      id: USER_ID,
      email: 'new-client@example.com',
      displayName: 'Villa Dafna',
      propertyId: steps.property ? '301' : null,
      roomId: steps.property ? '601:Villa Dafna' : null,
      completedAt,
    },
    steps,
    stepOrder: STEP_ORDER,
    airbnbAuthUrl: 'https://www.airbnb.com/oauth2/auth?client_id=test',
    airbnbMultiplier: 1.21,
    credits: { limit: 100, remaining: 87, resetsInSeconds: 200, requestCost: 1, observedAt: Date.now() },
  })

  const handlers: Record<string, (body: Record<string, unknown>) => unknown> = {
    'GET ': () => overview(),
    'POST /property': () => done('property', { propertyId: '301', roomId: '601', roomName: 'Villa Dafna', source: 'created' }),
    'POST /base-price': (body) => done('basePrice', { price: body.price, minStay: body.minStay ?? 1, from: '2026-10-12', to: '2027-10-12' }),
    'GET /airbnb/users': () => ({ users: [{ airbnbUserId: '111', name: 'Dana' }] }),
    'GET /airbnb/listings': () => ({ listings: [{ airbnbListingId: '555', name: 'Villa on the river', address: 'Dafna' }] }),
    'POST /airbnb/connect': (body) => done('airbnbConnect', body),
    'POST /airbnb/multiplier': () => done('airbnbMultiplier', { multiplier: 1.21 }),
    'POST /booking-com': (body) => done('bookingCom', { hotelId: body.hotelId ?? null, confirmedAt: new Date().toISOString() }),
    'POST /verify': () => done('verifyChannels', {
      airbnb: { connected: true, airbnbListingId: '555', multiplier: 1.21 },
      multiplierMatches: true,
      accountLinks: { airbnb: 3, booking: 1 },
      checkedAt: new Date().toISOString(),
    }),
    'POST /finalize': () => {
      completedAt = new Date().toISOString()
      return { ...done('finalize', { cachedDays: 92, cacheWarning: null, apiKeyCreated: true }), apiKey: 'hk_e2e_secret' }
    },
  }

  async function handle(route: Route) {
    const request = route.request()
    const url = new URL(request.url())
    const subPath = url.pathname.replace(`/api/admin/onboarding/${USER_ID}`, '')
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>
    requests.push({ path: `${request.method()} ${subPath}`, body })

    const handler = handlers[`${request.method()} ${subPath}`]
    if (!handler) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not mocked"}' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(handler(body)) })
  }

  return { handle, requests }
}

async function expectActiveStep(page: Page, title: string) {
  await expect(page.getByTestId('step-panel').getByRole('heading', { name: title })).toBeVisible()
}

test('admin onboards a new client end to end through the wizard', async ({ page, context, baseURL }) => {
  await signInAsAdmin(context, baseURL!)
  const backend = createFakeOnboardingBackend()
  await page.route(`**/api/admin/onboarding/${USER_ID}**`, backend.handle)

  await page.goto(`/admin/onboarding/${USER_ID}`)
  await expect(page.getByText('קליטת לקוח: Villa Dafna')).toBeVisible()
  await expect(page.getByText('קרדיטים שנותרו ב-Beds24: 87 מתוך 100')).toBeVisible()

  await expectActiveStep(page, 'נכס וחדר ב-Beds24')
  await page.getByLabel('מקסימום אורחים').fill('4')
  await page.getByRole('button', { name: 'צור נכס וחדר' }).click()

  await expectActiveStep(page, 'מחיר בסיס וזמינות')
  await page.getByLabel('מחיר ללילה (₪)').fill('600')
  await expect(page.getByText('ב-Airbnb המחיר יוצג כ-726 ₪')).toBeVisible()
  await page.getByRole('button', { name: 'שמור מחיר' }).click()

  await expectActiveStep(page, 'חיבור מודעת Airbnb')
  await page.getByRole('button', { name: 'טען חשבונות Airbnb מחוברים' }).click()
  await page.getByLabel('חשבון Airbnb').selectOption('111')
  await page.getByRole('button', { name: /Villa on the river/ }).click()

  await expectActiveStep(page, 'מכפיל מחיר ל-Airbnb')
  await page.getByRole('button', { name: 'החל מכפיל 1.21' }).click()

  await expectActiveStep(page, 'חיבור Booking.com')
  const confirmBooking = page.getByRole('button', { name: 'אשר שהחיבור הושלם' })
  await expect(confirmBooking).toBeDisabled()
  for (const checkbox of await page.getByRole('checkbox').all()) {
    await checkbox.check()
  }
  await page.getByLabel('מזהה מלון ב-Booking.com').fill('987654')
  await confirmBooking.click()

  await expectActiveStep(page, 'בדיקת חיבורים מול Beds24')
  await page.getByRole('button', { name: 'הרץ בדיקה' }).click()
  await expect(page.getByTestId('verify-results')).toContainText('מכפיל Airbnb בפועל: 1.21')

  await page.getByRole('button', { name: /הפעלה$/ }).click()
  await expectActiveStep(page, 'הפעלת הלקוח')
  await page.getByRole('button', { name: 'הפעל לקוח' }).click()
  await expect(page.getByTestId('api-key')).toHaveValue('hk_e2e_secret')
  await expect(page.getByText('פעיל', { exact: true })).toBeVisible()

  expect(backend.requests.map((r) => r.path).filter((p) => p.startsWith('POST'))).toEqual([
    'POST /property',
    'POST /base-price',
    'POST /airbnb/connect',
    'POST /airbnb/multiplier',
    'POST /booking-com',
    'POST /verify',
    'POST /finalize',
  ])
  expect(backend.requests.find((r) => r.path === 'POST /property')?.body).toMatchObject({ mode: 'create', name: 'Villa Dafna', maxPeople: 4 })
  expect(backend.requests.find((r) => r.path === 'POST /booking-com')?.body).toEqual({ hotelId: '987654' })
})
