import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'

let fakeClient: FakeSupabaseClient

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => fakeClient,
}))

vi.mock('@/lib/beds24/tokenManager', () => ({
  fetchWithTokenRefresh: vi.fn(),
}))

import { refreshRoomCache } from './cache'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('refreshRoomCache — preserving manual blocks', () => {
  const USER_ID = 'user-1'
  const PROPERTY_ID = '306559'
  const ROOM_ID = '638851'

  beforeEach(() => {
    vi.mocked(fetchWithTokenRefresh).mockReset()
  })

  it('preserves is_manual_block: true and num_avail: 0 across multiple cache refreshes', async () => {
    // Initial state: date 2026-11-01 was manually blocked in availability_cache
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        {
          user_id: USER_ID,
          room_id: ROOM_ID,
          property_id: PROPERTY_ID,
          date: '2026-11-01',
          num_avail: 0,
          price: 500,
          min_stay: 1,
          cached_at: '2026-10-21T00:00:00Z',
          is_manual_block: true,
        },
      ],
    })

    // Beds24 returns open availability for the calendar and 0 bookings
    vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url) => {
      if ((url as string).includes('/inventory/rooms/calendar')) {
        return jsonResponse({
          success: true,
          type: 'calendar',
          data: [
            {
              roomId: Number(ROOM_ID),
              calendar: [
                { from: '2026-11-01', to: '2026-11-02', price1: 500, numAvail: 1 },
              ],
            },
          ],
        })
      }
      if ((url as string).includes('/bookings')) {
        return jsonResponse([])
      }
      return jsonResponse({ success: false }, 404)
    })

    // First cache refresh
    const res1 = await refreshRoomCache(USER_ID, PROPERTY_ID, ROOM_ID, 'access', 'refresh')
    expect(res1.error).toBeUndefined()

    const rowsAfterFirst = fakeClient.__table('availability_cache')
    const nov1AfterFirst = rowsAfterFirst.find((r) => r.date === '2026-11-01')
    expect(nov1AfterFirst).toBeDefined()
    expect(nov1AfterFirst?.num_avail).toBe(0)
    // Critical assertion: is_manual_block must NOT be reset to false!
    expect(nov1AfterFirst?.is_manual_block).toBe(true)

    // Second cache refresh: simulates subsequent refresh cycle
    const res2 = await refreshRoomCache(USER_ID, PROPERTY_ID, ROOM_ID, 'access', 'refresh')
    expect(res2.error).toBeUndefined()

    const rowsAfterSecond = fakeClient.__table('availability_cache')
    const nov1AfterSecond = rowsAfterSecond.find((r) => r.date === '2026-11-01')
    expect(nov1AfterSecond).toBeDefined()
    expect(nov1AfterSecond?.num_avail).toBe(0)
    expect(nov1AfterSecond?.is_manual_block).toBe(true)
  })

  it('treats Beds24 override: "blackout" as num_avail: 0 during cache refresh', async () => {
    fakeClient = createFakeSupabaseClient({
      availability_cache: [],
    })

    vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url) => {
      if ((url as string).includes('/inventory/rooms/calendar')) {
        return jsonResponse({
          success: true,
          type: 'calendar',
          data: [
            {
              roomId: Number(ROOM_ID),
              calendar: [
                { from: '2026-11-05', to: '2026-11-05', price1: 600, override: 'blackout', numAvail: 1 },
              ],
            },
          ],
        })
      }
      if ((url as string).includes('/bookings')) {
        return jsonResponse([])
      }
      return jsonResponse({ success: false }, 404)
    })

    const res = await refreshRoomCache(USER_ID, PROPERTY_ID, ROOM_ID, 'access', 'refresh')
    expect(res.error).toBeUndefined()

    const rows = fakeClient.__table('availability_cache')
    const nov5 = rows.find((r) => r.date === '2026-11-05')
    expect(nov5).toBeDefined()
    expect(nov5?.num_avail).toBe(0)
  })
})
