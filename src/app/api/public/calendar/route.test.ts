/**
 * Integration tests for the public calendar route.
 *
 * Exercises the real `GET` handler end-to-end, with Beds24 and Supabase
 * fully mocked — matching the pattern used in
 * `src/app/api/dashboard/rooms/route.test.ts`. No real network call ever
 * happens here. Focused on the cache-first behaviour added on top of the
 * pre-existing live-fetch path.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import {
  beds24CalendarResponse,
  beds24PostSuccessResponse,
  BEDS24_ROOM_ID,
  BEDS24_PROPERTY_ID,
} from '@/__tests__/fixtures/beds24'
import { GET } from './route'

let fakeClient: FakeSupabaseClient

vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => fakeClient,
}))

const API_KEY = 'hst_live_test_key'
const USER_ID = 'user-1'
const ROOM_ID = String(BEDS24_ROOM_ID)
const PROPERTY_ID = String(BEDS24_PROPERTY_ID)

function baseTables(overrides: Record<string, unknown[]> = {}) {
  return {
    api_keys: [
      { id: 'key-1', user_id: USER_ID, key: API_KEY, is_active: true, allowed_room_ids: [] },
    ],
    subscriptions: [
      { user_id: USER_ID, status: 'active', expires_at: null, created_at: '2026-01-01T00:00:00Z' },
    ],
    users: [
      {
        id: USER_ID,
        beds24_token: 'user-access-token',
        beds24_refresh_token: 'user-refresh-token',
        property_id: PROPERTY_ID,
      },
    ],
    availability_cache: [],
    ...overrides,
  }
}

function getRequest(query = `roomId=${ROOM_ID}&from=2026-07-11&to=2026-07-17`): NextRequest {
  return new Request(`http://localhost/api/public/calendar?${query}`, {
    headers: { 'x-api-key': API_KEY },
  }) as unknown as NextRequest
}

/** Routes Beds24 calls by URL so the test can assert whether Beds24 was hit at all. */
function mockBeds24Live() {
  vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url) => {
    if (url.includes('/inventory/rooms/calendar')) {
      return jsonResponse(beds24CalendarResponse([{ from: '2026-07-11', to: '2026-07-17', price1: 600 }]))
    }
    if (url.includes('/bookings')) {
      return jsonResponse({ data: [] })
    }
    return jsonResponse({ success: false }, 404)
  })
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  fakeClient = createFakeSupabaseClient(baseTables())
  vi.mocked(fetchWithTokenRefresh).mockReset()
})

describe('GET /api/public/calendar — cache-first behaviour', () => {
  it('serves from availability_cache without calling Beds24 when the cache is fresh', async () => {
    const freshCachedAt = new Date().toISOString()
    fakeClient = createFakeSupabaseClient(
      baseTables({
        availability_cache: [
          {
            user_id: USER_ID,
            room_id: ROOM_ID,
            property_id: PROPERTY_ID,
            date: '2026-07-12',
            price: 555,
            prices: null,
            num_avail: 1,
            min_stay: 1,
            cached_at: freshCachedAt,
          },
        ],
      }),
    )
    mockBeds24Live()

    const response = await GET(getRequest())
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.availability).toEqual([
      expect.objectContaining({ date: '2026-07-12', price: 555, available: true }),
    ])

    // The cache was fresh, so the live Beds24 endpoint must never be called.
    expect(fetchWithTokenRefresh).not.toHaveBeenCalled()
  })

  it('falls back to a live Beds24 fetch when there is no cache yet', async () => {
    mockBeds24Live()

    const response = await GET(getRequest())
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.availability.length).toBeGreaterThan(0)

    // Live fetch must have happened since availability_cache was empty.
    expect(fetchWithTokenRefresh).toHaveBeenCalled()
    const calledUrls = vi.mocked(fetchWithTokenRefresh).mock.calls.map((c) => c[0] as string)
    expect(calledUrls.some((u) => u.includes('/inventory/rooms/calendar'))).toBe(true)
  })

  it('falls back to a live Beds24 fetch when the cache is older than the freshness window', async () => {
    const staleCachedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour old
    fakeClient = createFakeSupabaseClient(
      baseTables({
        availability_cache: [
          {
            user_id: USER_ID,
            room_id: ROOM_ID,
            property_id: PROPERTY_ID,
            date: '2026-07-12',
            price: 111,
            prices: null,
            num_avail: 1,
            min_stay: 1,
            cached_at: staleCachedAt,
          },
        ],
      }),
    )
    mockBeds24Live()

    const response = await GET(getRequest())
    const body = await response.json()

    // Live data (price1: 600) must win over the stale cached price (111).
    const day = body.availability.find((d: { date: string }) => d.date === '2026-07-12')
    expect(day.price).toBe(600)
    expect(fetchWithTokenRefresh).toHaveBeenCalled()
  })

  it('returns 503 when neither the account nor the environment has Beds24 tokens configured', async () => {
    // The route falls back to the global env tokens (set in test setup) when
    // the user has none of their own — clear them to hit the true "no
    // tokens anywhere" path.
    const prevToken = process.env.BEDS24_TOKEN
    const prevRefreshToken = process.env.BEDS24_REFRESH_TOKEN
    delete process.env.BEDS24_TOKEN
    delete process.env.BEDS24_REFRESH_TOKEN

    fakeClient = createFakeSupabaseClient(
      baseTables({
        users: [{ id: USER_ID, beds24_token: null, beds24_refresh_token: null, property_id: PROPERTY_ID }],
      }),
    )

    try {
      const response = await GET(getRequest())
      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.error).toBe('beds24_not_configured')
      expect(fetchWithTokenRefresh).not.toHaveBeenCalled()
    } finally {
      process.env.BEDS24_TOKEN = prevToken
      process.env.BEDS24_REFRESH_TOKEN = prevRefreshToken
    }
  })

  it('returns 401 for an invalid API key', async () => {
    const request = new Request(`http://localhost/api/public/calendar?roomId=${ROOM_ID}`, {
      headers: { 'x-api-key': 'not-a-real-key' },
    }) as unknown as NextRequest
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 403 when the room is not in the key\'s allowed_room_ids', async () => {
    fakeClient = createFakeSupabaseClient(
      baseTables({
        api_keys: [
          { id: 'key-1', user_id: USER_ID, key: API_KEY, is_active: true, allowed_room_ids: ['some-other-room'] },
        ],
      }),
    )

    const response = await GET(getRequest())
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('room_not_allowed')
  })
})
