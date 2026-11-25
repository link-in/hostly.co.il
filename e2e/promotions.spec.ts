import { test, expect, type Page } from '@playwright/test'
import { E2E_DEMO_USER } from './constants'
import { signInAsDemoUser, signInAsUser } from './helpers/session'

/**
 * Automated campaigns page. Every promotions API call (and therefore Meta) is mocked:
 * the test checks that nothing is published without an explicit two-step approval.
 */
const draft = {
  id: 'c1',
  userId: E2E_DEMO_USER.id,
  ruleId: 'rule1',
  channel: 'meta_ads',
  trigger: 'weekend',
  roomId: 'r1',
  roomName: 'סוויטה',
  checkIn: '2099-01-08',
  checkOut: '2099-01-10',
  status: 'pending_approval',
  content: {
    headline: 'סופ״ש פנוי בגליל',
    primaryText: 'וילה בגליל פנויה בין 8.1 עד 10.1.',
    description: 'הזמנה ישירה',
    callToAction: 'BOOK_TRAVEL',
    hashtags: ['#צימר'],
  },
  imageUrls: [],
  landingUrl:
    'https://villa.hostly.co.il/?checkin=2099-01-08&checkout=2099-01-10&utm_source=facebook&utm_medium=paid_social&utm_campaign=hostly_promo&utm_content=r1_2099-01-08',
  totalBudget: 80,
  currency: 'ILS',
  audience: { countries: ['IL'], ageMin: 21, ageMax: 65 },
  nightlyPrice: 600,
  externalIds: {},
  stats: {},
  error: null,
  stopReason: null,
  approvedAt: null,
  launchedAt: null,
  stoppedAt: null,
  createdAt: '2099-01-01T08:00:00Z',
}

const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function mockPromotionsApi(page: Page, actions: unknown[]) {
  await page.route('**/api/dashboard/promotions/connection', (route) =>
    route.fulfill(
      json({
        configured: true,
        connection: {
          channel: 'meta_ads',
          status: 'active',
          tokenExpiresAt: null,
          assets: { adAccountId: 'act_1', pageId: '2', pageName: 'וילה בגליל', instagramUsername: 'villa' },
          monthlyBudgetCap: 500,
          ready: true,
        },
      }),
    ),
  )
  await page.route('**/api/dashboard/promotions/rules', (route) => route.fulfill(json({ rules: [] })))
  await page.route('**/api/dashboard/room-list', (route) => route.fulfill(json([{ id: 'r1', name: 'סוויטה' }])))
  await page.route('**/api/dashboard/promotions/campaigns', (route) => route.fulfill(json({ campaigns: [draft] })))
  await page.route('**/api/dashboard/promotions/campaigns/c1', async (route) => {
    const body = route.request().postDataJSON() as { action: string }
    actions.push(body)
    const status = body.action === 'approve' ? 'active' : 'rejected'
    await route.fulfill(json({ campaign: { ...draft, status, externalIds: { campaignId: 'meta-1' } } }))
  })
}

test('a host approves an AI draft only after confirming the budget', async ({ page, context, baseURL }) => {
  const actions: unknown[] = []
  await signInAsUser(context, baseURL!, { ...E2E_DEMO_USER, isDemo: false })
  await mockPromotionsApi(page, actions)

  await page.goto('/dashboard/promotions')

  const card = page.getByTestId('promotions-campaign')
  await expect(card).toBeVisible()
  await expect(card.getByTestId('promotions-ad-preview')).toContainText('סופ״ש פנוי בגליל')
  await expect(card.getByTestId('promotions-ad-preview')).toContainText('villa.hostly.co.il')
  await expect(page.getByTestId('promotions-connection-summary')).toContainText('@villa')

  // First click only opens the confirmation with the budget — nothing is published yet.
  await card.getByTestId('promotions-approve').click()
  await expect(card.getByTestId('promotions-approve-confirm')).toContainText('80')
  expect(actions).toEqual([])

  await card.getByTestId('promotions-approve-confirm-button').click()
  await expect(card).toHaveAttribute('data-status', 'active')
  expect(actions).toEqual([{ action: 'approve' }])
})

test('a host can reject a draft', async ({ page, context, baseURL }) => {
  const actions: unknown[] = []
  await signInAsUser(context, baseURL!, { ...E2E_DEMO_USER, isDemo: false })
  await mockPromotionsApi(page, actions)

  await page.goto('/dashboard/promotions')
  await page.getByTestId('promotions-reject').click()

  expect(actions).toEqual([{ action: 'reject' }])
  await expect(page.getByTestId('promotions-no-campaigns')).toBeVisible()
})

test('demo accounts see the page but cannot approve or connect', async ({ page, context, baseURL }) => {
  await signInAsDemoUser(context, baseURL!)
  await mockPromotionsApi(page, [])

  await page.goto('/dashboard/promotions')

  await expect(page.getByTestId('promotions-campaign')).toBeVisible()
  await expect(page.getByTestId('promotions-approve')).toHaveCount(0)
  await expect(page.getByTestId('promotions-add-rule')).toHaveCount(0)
})

test('the campaigns page is reachable from the dashboard menu', async ({ page, context, baseURL }) => {
  await signInAsDemoUser(context, baseURL!)
  await mockPromotionsApi(page, [])

  await page.goto('/dashboard/profile')
  await page.locator('a[href="/dashboard/promotions"]').first().click({ force: true })
  await expect(page).toHaveURL(/\/dashboard\/promotions/)
})
