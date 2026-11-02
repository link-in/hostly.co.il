import { test, expect, type Page } from '@playwright/test'
import { E2E_DEMO_USER } from './constants'
import { signInAsUser } from './helpers/session'

/**
 * HOS-31 follow-up: when the rooms API flags a Hostly block as still open in
 * Beds24 (`unsynced: true`), the calendar warns the owner and "סגור שוב"
 * re-sends a blackout for exactly those dates.
 */
const OWNER = { ...E2E_DEMO_USER, isDemo: false }

function dateKey(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const UNSYNCED = dateKey(2)
const SYNCED_BLOCK = dateKey(3)

async function mockDashboardApis(page: Page, postedPayloads: unknown[]) {
  let resynced = false

  await page.route('**/api/dashboard/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  )
  await page.route('**/api/commission-rates**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  )
  await page.route('**/api/dashboard/subscription', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'active', planId: 'pro', billingCycle: 'monthly', daysRemaining: 30, expiresAt: null }),
    }),
  )
  await page.route('**/api/dashboard/room-list', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.route('**/api/dashboard/bookings**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
  )
  await page.route('**/api/dashboard/rooms**', async (route) => {
    if (route.request().method() === 'POST') {
      postedPayloads.push(route.request().postDataJSON())
      resynced = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      return
    }
    const prices = [
      { date: UNSYNCED, price: 700, roomId: '638851', numAvail: 0, ...(resynced ? {} : { unsynced: true }) },
      { date: SYNCED_BLOCK, price: 700, roomId: '638851', numAvail: 0 },
    ]
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prices }) })
  })
}

test('warns about blocks still open on the channels and re-closes them', async ({ page, context, baseURL }) => {
  const postedPayloads: unknown[] = []
  await signInAsUser(context, baseURL!, OWNER)
  await mockDashboardApis(page, postedPayloads)

  await page.goto('/dashboard')
  const banner = page.getByTestId('unsynced-blocks-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('תאריכים שחסמת עדיין פתוחים להזמנה בערוצים')
  const [, month, day] = UNSYNCED.split('-')
  await expect(banner).toContainText(`${day}/${month}`)

  await banner.getByRole('button', { name: 'סגור שוב' }).click()

  await expect(banner).toBeHidden()
  expect(postedPayloads).toHaveLength(1)
  const payload = postedPayloads[0] as Array<{ calendar: Array<Record<string, unknown>> }>
  expect(payload[0].calendar).toEqual([
    { from: UNSYNCED, to: UNSYNCED, numAvail: 0, override: 'blackout', price1: 700 },
  ])
})
