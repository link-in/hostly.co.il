/**
 * refreshRoomCache: Beds24 is the source of truth for blocked days (includeNumAvail).
 * Beds24 and Supabase are mocked - no network access.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import { refreshRoomCache } from './cache'

let fakeClient: FakeSupabaseClient

vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => fakeClient,
}))

const USER_ID = 'user-1'
const ROOM_ID = '638851'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function mockBeds24(calendar: Record<string, unknown>[], bookings: Record<string, unknown>[] = []) {
  vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url) => {
    if (String(url).includes('/bookings')) return jsonResponse({ data: bookings })
    return jsonResponse({ data: [{ roomId: Number(ROOM_ID), calendar }] })
  })
}

function cacheRow(date: string) {
  return fakeClient.__table('availability_cache').find((r) => r.date === date)
}

function refresh(months?: number) {
  return refreshRoomCache(USER_ID, '306559', ROOM_ID, 'access', 'refresh', months ? { months } : undefined)
}

describe('refreshRoomCache', () => {
  beforeEach(() => {
    fakeClient = createFakeSupabaseClient()
    vi.mocked(fetchWithTokenRefresh).mockReset()
  })

  it('asks Beds24 for numAvail and the requested number of months', async () => {
    mockBeds24([])
    await refresh(12)

    const calendarUrl = new URL(String(vi.mocked(fetchWithTokenRefresh).mock.calls[0][0]))
    expect(calendarUrl.searchParams.get('includeNumAvail')).toBe('true')

    const start = new Date(calendarUrl.searchParams.get('startDate')!)
    const end = new Date(calendarUrl.searchParams.get('endDate')!)
    const days = (end.getTime() - start.getTime()) / 86_400_000
    expect(days).toBeGreaterThanOrEqual(364)
  })

  it('stores a day blocked in Beds24 as blocked, even without a manual flag in the cache', async () => {
    mockBeds24([
      { from: '2030-01-10', to: '2030-01-10', price1: 400, numAvail: 1 },
      { from: '2030-01-11', to: '2030-01-12', price1: 650, numAvail: 0 },
    ])
    await refresh()

    expect(cacheRow('2030-01-10')?.num_avail).toBe(1)
    expect(cacheRow('2030-01-11')?.num_avail).toBe(0)
    expect(cacheRow('2030-01-12')?.num_avail).toBe(0)
  })

  it('releases a day that was blocked in the cache but opened directly in Beds24', async () => {
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: USER_ID, room_id: ROOM_ID, property_id: '306559', date: '2030-02-01', price: 500, num_avail: 0, is_manual_block: true },
      ],
    })
    mockBeds24([{ from: '2030-02-01', to: '2030-02-01', price1: 500, numAvail: 1 }])
    await refresh()

    expect(cacheRow('2030-02-01')?.num_avail).toBe(1)
  })

  it('keeps a cached manual block when Beds24 does not return numAvail', async () => {
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: USER_ID, room_id: ROOM_ID, property_id: '306559', date: '2030-03-01', price: 500, num_avail: 0, is_manual_block: true },
      ],
    })
    mockBeds24([{ from: '2030-03-01', to: '2030-03-01', price1: 500 }])
    await refresh()

    expect(cacheRow('2030-03-01')?.num_avail).toBe(0)
  })

  it('keeps a booked night blocked even when Beds24 reports it as available', async () => {
    mockBeds24(
      [{ from: '2030-04-01', to: '2030-04-03', price1: 500, numAvail: 1 }],
      [{ status: 'confirmed', firstNight: '2030-04-01', departure: '2030-04-03' }],
    )
    await refresh()

    expect(cacheRow('2030-04-01')?.num_avail).toBe(0)
    expect(cacheRow('2030-04-02')?.num_avail).toBe(0)
    expect(cacheRow('2030-04-03')?.num_avail).toBe(1)
  })

  it('reports the Beds24 status when the calendar request fails', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(jsonResponse({ error: 'Token not valid' }, 401))

    const result = await refresh()

    expect(result).toEqual({ upserted: 0, error: 'Beds24 returned 401' })
  })
})
