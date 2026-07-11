/**
 * Integration tests for `processWebhook()` — focused on the cache-refresh
 * Beds24 token resolution added for multi-tenant support.
 *
 * Every dependency (DB repos, customer upsert, cache refresh, WhatsApp) is
 * mocked with `vi.mock`, matching the pattern used in
 * `src/app/api/dashboard/rooms/route.test.ts`. No real network/DB call ever
 * happens here — this only verifies orchestration inside `processWebhook()`.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { isDuplicateNotification, insertNotification, updateNotificationStatus } from '@/lib/db/notifications'
import { getUserIdByPropertyRoom, getOwnerInfoByPropertyRoom, getUserBeds24Tokens } from '@/lib/db/users'
import { addOrUpdateCustomer } from '@/lib/customers/addOrUpdateCustomer'
import { refreshRoomCache } from '@/lib/availability/cache'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { processWebhook } from './processor'
import type { Beds24WebhookWrapper } from './types'
import { BEDS24_ROOM_ID, BEDS24_PROPERTY_ID } from '@/__tests__/fixtures/beds24'

vi.mock('@/lib/db/notifications', () => ({
  isDuplicateNotification: vi.fn(),
  insertNotification: vi.fn(),
  updateNotificationStatus: vi.fn(),
}))
vi.mock('@/lib/db/users', () => ({
  getUserIdByPropertyRoom: vi.fn(),
  getOwnerInfoByPropertyRoom: vi.fn(),
  getUserBeds24Tokens: vi.fn(),
}))
vi.mock('@/lib/customers/addOrUpdateCustomer', () => ({ addOrUpdateCustomer: vi.fn() }))
vi.mock('@/lib/availability/cache', () => ({ refreshRoomCache: vi.fn() }))
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: vi.fn() }))

const TEST_USER_ID = 'user-1'

function buildWebhook(overrides: Partial<Beds24WebhookWrapper['booking']> = {}): Beds24WebhookWrapper {
  return {
    timeStamp: '2026-07-11T10:00:00Z',
    booking: {
      id: 42,
      propertyId: BEDS24_PROPERTY_ID,
      roomId: BEDS24_ROOM_ID,
      status: 'confirmed',
      subStatus: '',
      arrival: '2026-08-01',
      departure: '2026-08-05',
      numAdult: 2,
      numChild: 0,
      firstName: 'Yossi',
      lastName: 'Cohen',
      email: 'yossi@example.com',
      phone: '',
      mobile: '0521234567',
      address: '',
      city: '',
      postcode: '',
      country: '',
      price: 2000,
      deposit: 0,
      tax: 0,
      bookingTime: '2026-07-11T09:00:00Z',
      modifiedTime: '2026-07-11T09:00:00Z',
      ...overrides,
    },
  }
}

// Flushes any pending microtasks queued by the fire-and-forget
// `maybeRefreshCache(...).catch(...)` call inside `processWebhook`.
async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isDuplicateNotification).mockResolvedValue(false)
  vi.mocked(insertNotification).mockResolvedValue({ id: 'notif-1', error: null })
  vi.mocked(updateNotificationStatus).mockResolvedValue(undefined)
  vi.mocked(getUserIdByPropertyRoom).mockResolvedValue(TEST_USER_ID)
  vi.mocked(getOwnerInfoByPropertyRoom).mockResolvedValue({ phoneNumber: null, roomName: 'Mountain View' })
  vi.mocked(addOrUpdateCustomer).mockResolvedValue({ success: true, customerId: 'customer-1' })
  vi.mocked(refreshRoomCache).mockResolvedValue({ upserted: 3 })
  vi.mocked(sendWhatsAppMessage).mockResolvedValue({ success: true, provider: 'mock' })
  vi.mocked(getUserBeds24Tokens).mockReset()

  process.env.BEDS24_TOKEN = 'env-access-token'
  process.env.BEDS24_REFRESH_TOKEN = 'env-refresh-token'
})

describe('processWebhook — cache refresh token resolution', () => {
  it('uses the specific user Beds24 tokens when they are configured', async () => {
    vi.mocked(getUserBeds24Tokens).mockResolvedValue({
      accessToken: 'user-access-token',
      refreshToken: 'user-refresh-token',
    })

    const result = await processWebhook(buildWebhook())
    await flushMicrotasks()

    expect(result.success).toBe(true)
    expect(getUserBeds24Tokens).toHaveBeenCalledWith(TEST_USER_ID)
    expect(refreshRoomCache).toHaveBeenCalledWith(
      TEST_USER_ID,
      String(BEDS24_PROPERTY_ID),
      String(BEDS24_ROOM_ID),
      'user-access-token',
      'user-refresh-token',
    )
  })

  it('falls back to the global env tokens when the user has none configured', async () => {
    vi.mocked(getUserBeds24Tokens).mockResolvedValue({ accessToken: null, refreshToken: null })

    await processWebhook(buildWebhook())
    await flushMicrotasks()

    expect(refreshRoomCache).toHaveBeenCalledWith(
      TEST_USER_ID,
      String(BEDS24_PROPERTY_ID),
      String(BEDS24_ROOM_ID),
      'env-access-token',
      'env-refresh-token',
    )
  })

  it('does not refresh the cache when neither user nor env tokens are available', async () => {
    vi.mocked(getUserBeds24Tokens).mockResolvedValue({ accessToken: null, refreshToken: null })
    delete process.env.BEDS24_TOKEN
    delete process.env.BEDS24_REFRESH_TOKEN

    await processWebhook(buildWebhook())
    await flushMicrotasks()

    expect(refreshRoomCache).not.toHaveBeenCalled()
  })

  it('does not refresh the cache when the booking cannot be matched to a user', async () => {
    vi.mocked(getUserIdByPropertyRoom).mockResolvedValue(null)

    await processWebhook(buildWebhook())
    await flushMicrotasks()

    expect(getUserBeds24Tokens).not.toHaveBeenCalled()
    expect(refreshRoomCache).not.toHaveBeenCalled()
  })

  it('skips cache refresh entirely for a cancelled booking', async () => {
    vi.mocked(getUserBeds24Tokens).mockResolvedValue({
      accessToken: 'user-access-token',
      refreshToken: 'user-refresh-token',
    })

    const result = await processWebhook(buildWebhook({ status: 'cancelled' }))
    await flushMicrotasks()

    expect(result.skipped).toBe(true)
    expect(refreshRoomCache).not.toHaveBeenCalled()
  })
})
