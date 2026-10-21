/**
 * Integration tests for the rooms calendar route.
 *
 * These exercise the real `GET`/`POST` handlers end-to-end, with Beds24 and
 * Supabase fully mocked — this is the automated replacement for the manual
 * round-trip we ran by hand against the live Beds24 API while debugging the
 * date-blocking feature (block -> verify GET shows blocked -> unblock ->
 * verify GET shows open again). No real network call ever happens here.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import {
  beds24CalendarResponse,
  beds24RoomsInfoResponse,
  beds24PostSuccessResponse,
  beds24AvailabilityResponse,
  BEDS24_ROOM_ID,
  BEDS24_PROPERTY_ID,
} from '@/__tests__/fixtures/beds24'
import { GET, POST } from './route'

let fakeClient: FakeSupabaseClient

// vi.mock calls are hoisted above all imports by Vitest, and `route.ts` only
// calls these lazily (inside the GET/POST handlers), so referencing
// `fakeClient` here is safe — it's assigned in `beforeEach` before any test runs.
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => fakeClient,
}))

const TEST_USER = {
  id: 'user-1',
  email: 'demo@hostly.co.il',
  displayName: 'Demo',
  propertyId: String(BEDS24_PROPERTY_ID),
  roomId: String(BEDS24_ROOM_ID),
  role: 'owner' as const,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Routes Beds24 calls by URL/method so GET (calendar/rooms-info) and POST behave independently. */
function mockBeds24({
  calendarEntries,
  postCalendarEcho,
  availability,
}: {
  calendarEntries?: { from: string; to: string; price1: number }[]
  postCalendarEcho?: { from: string; to: string; numAvail?: number }[]
  availability?: Record<string, boolean>
} = {}) {
  vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url, init) => {
    const method = init?.method ?? 'GET'
    if (method === 'POST') {
      return jsonResponse(beds24PostSuccessResponse(postCalendarEcho ?? []), 201)
    }
    if (url.includes('/inventory/rooms/calendar')) {
      return jsonResponse(beds24CalendarResponse(calendarEntries))
    }
    if (url.includes('/inventory/rooms/availability')) {
      return jsonResponse(beds24AvailabilityResponse(availability ?? {}))
    }
    if (url.includes('/inventory/rooms')) {
      return jsonResponse(beds24RoomsInfoResponse())
    }
    return jsonResponse({ success: false }, 404)
  })
}

function getRequest(query = `roomId=${BEDS24_ROOM_ID}`) {
  return new Request(`http://localhost/api/dashboard/rooms?${query}`)
}

function postRequest(payload: unknown) {
  return new Request('http://localhost/api/dashboard/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

beforeEach(() => {
  fakeClient = createFakeSupabaseClient({ availability_cache: [] })
  vi.mocked(getServerSession).mockResolvedValue({ user: TEST_USER } as never)
  vi.mocked(fetchWithTokenRefresh).mockReset()
})

describe('POST /api/dashboard/rooms — blocking', () => {
  it('forwards numAvail:0 and override:blackout to Beds24 and writes it to availability_cache', async () => {
    mockBeds24({ postCalendarEcho: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 0 }] })

    const payload = [
      { roomId: BEDS24_ROOM_ID, calendar: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 0, override: 'blackout', price1: 600 }] },
    ]
    const response = await POST(postRequest(payload))
    expect(response.status).toBe(200)

    const cacheRows = fakeClient.__table('availability_cache')
    expect(cacheRows).toHaveLength(1)
    // Regression: date must be exactly 2026-07-12, not shifted by a day, with is_manual_block: true
    expect(cacheRows[0]).toMatchObject({ date: '2026-07-12', num_avail: 0, is_manual_block: true })

    // Verify payload sent to Beds24 includes override: 'blackout'
    const beds24Calls = vi.mocked(fetchWithTokenRefresh).mock.calls
    const postCall = beds24Calls.find((call) => call[1]?.method === 'POST')
    expect(postCall).toBeDefined()
    const sentBody = JSON.parse(postCall![1]!.body as string)
    expect(sentBody[0].calendar[0]).toMatchObject({
      numAvail: 0,
      override: 'blackout',
    })
  })
})

describe('POST /api/dashboard/rooms — token resolution', () => {
  it('falls back to resolveBeds24Tokens from DB when session has no beds24Token', async () => {
    fakeClient = createFakeSupabaseClient({
      availability_cache: [],
      users: [
        { id: 'user-1', beds24_token: 'db-access-token', beds24_refresh_token: 'db-refresh-token' },
      ],
    })
    mockBeds24({ postCalendarEcho: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 0 }] })

    const payload = [
      { roomId: BEDS24_ROOM_ID, calendar: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 0, override: 'blackout' }] },
    ]
    const response = await POST(postRequest(payload))
    expect(response.status).toBe(200)

    const beds24Calls = vi.mocked(fetchWithTokenRefresh).mock.calls
    const postCall = beds24Calls.find((call) => call[1]?.method === 'POST')
    expect(postCall).toBeDefined()
    expect(postCall![2]).toEqual({
      accessToken: 'db-access-token',
      refreshToken: 'db-refresh-token',
    })
  })
})

describe('POST /api/dashboard/rooms — Beds24 soft failure', () => {
  it('returns an error (and skips availability_cache) when Beds24 answers 201 with success:false', async () => {
    // Regression: a token from the wrong Beds24 account gets 201 + "invalid roomId".
    vi.mocked(fetchWithTokenRefresh).mockImplementation(async () =>
      jsonResponse(
        [{ success: false, errors: [{ action: 'process inventory rooms calendar', message: 'invalid roomId' }] }],
        201,
      ),
    )

    const payload = [
      { roomId: BEDS24_ROOM_ID, calendar: [{ from: '2026-07-12', to: '2026-07-12', price1: 600, numAvail: 1 }] },
    ]
    const response = await POST(postRequest(payload))

    expect(response.status).toBe(502)
    const body = await response.json()
    expect(body.error).toContain('invalid roomId')
    expect(fakeClient.__table('availability_cache')).toHaveLength(0)
  })
})

describe('GET /api/dashboard/rooms — overlay', () => {
  it('shows a manually-blocked date as numAvail:0 even though Beds24 never returns it', async () => {
    // Beds24's calendar GET only ever returns price overrides for July 11-15 —
    // it does NOT include July 12 with any numAvail field, by design.
    mockBeds24({ calendarEntries: [{ from: '2026-07-11', to: '2026-07-15', price1: 600 }] })
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: 'user-1', room_id: String(BEDS24_ROOM_ID), date: '2026-07-12', num_avail: 0 },
      ],
    })

    const response = await GET(getRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    const july12 = body.prices.find((p: { date: string }) => p.date === '2026-07-12')
    expect(july12).toMatchObject({ date: '2026-07-12', numAvail: 0 })

    const july13 = body.prices.find((p: { date: string }) => p.date === '2026-07-13')
    expect(july13).toMatchObject({ numAvail: 1 })
  })

  it('requests includeNumAvail and includeOverrides from Beds24', async () => {
    mockBeds24({ calendarEntries: [{ from: '2026-07-11', to: '2026-07-15', price1: 600 }] })
    await GET(getRequest())
    const beds24Calls = vi.mocked(fetchWithTokenRefresh).mock.calls
    const calCall = beds24Calls.find((call) => (call[0] as string).includes('/inventory/rooms/calendar'))
    expect(calCall).toBeDefined()
    const calUrl = new URL(calCall![0] as string)
    expect(calUrl.searchParams.get('includeNumAvail')).toBe('1')
    expect(calUrl.searchParams.get('includeOverrides')).toBe('1')
  })

  it('treats Beds24 calendar rows with override:blackout as numAvail:0', async () => {
    vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url) => {
      if ((url as string).includes('/inventory/rooms/calendar')) {
        return jsonResponse({
          success: true,
          type: 'calendar',
          count: 1,
          data: [
            {
              roomId: BEDS24_ROOM_ID,
              calendar: [
                { from: '2026-07-11', to: '2026-07-11', price1: 600, override: 'blackout' },
                { from: '2026-07-12', to: '2026-07-12', price1: 600, override: 'none' },
              ],
            },
          ],
        })
      }
      if ((url as string).includes('/inventory/rooms')) {
        return jsonResponse(beds24RoomsInfoResponse())
      }
      return jsonResponse({ success: false }, 404)
    })

    const response = await GET(getRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    const july11 = body.prices.find((p: { date: string }) => p.date === '2026-07-11')
    expect(july11).toMatchObject({ date: '2026-07-11', numAvail: 0 })
    const july12 = body.prices.find((p: { date: string }) => p.date === '2026-07-12')
    expect(july12).toMatchObject({ date: '2026-07-12', numAvail: 1 })
  })

  it('treats Capitalized "Blackout", flat CalendarDay items, and numAvail <= 0 as blocked', async () => {
    vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url) => {
      if ((url as string).includes('/inventory/rooms/calendar')) {
        return jsonResponse({
          success: true,
          data: [
            // Case with capital 'Blackout' and negative availability
            { roomId: BEDS24_ROOM_ID, date: '2026-10-22', price1: 700, override: 'Blackout', numAvail: 0 },
            { roomId: BEDS24_ROOM_ID, date: '2026-10-23', price1: 700, override: 'Blackout', numAvail: -1 },
            { roomId: BEDS24_ROOM_ID, date: '2026-10-24', price1: 400, numAvail: 0 },
            { roomId: BEDS24_ROOM_ID, date: '2026-10-25', price1: 500, numAvail: 1 },
          ],
        })
      }
      if ((url as string).includes('/inventory/rooms')) {
        return jsonResponse(beds24RoomsInfoResponse())
      }
      return jsonResponse({ success: false }, 404)
    })

    const response = await GET(getRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    const oct22 = body.prices.find((p: { date: string }) => p.date === '2026-10-22')
    const oct23 = body.prices.find((p: { date: string }) => p.date === '2026-10-23')
    const oct24 = body.prices.find((p: { date: string }) => p.date === '2026-10-24')
    const oct25 = body.prices.find((p: { date: string }) => p.date === '2026-10-25')

    expect(oct22).toMatchObject({ date: '2026-10-22', numAvail: 0 })
    expect(oct23).toMatchObject({ date: '2026-10-23', numAvail: 0 })
    expect(oct24).toMatchObject({ date: '2026-10-24', numAvail: 0 })
    expect(oct25).toMatchObject({ date: '2026-10-25', numAvail: 1 })
  })

  it('marks dates as numAvail:0 when /inventory/rooms/availability returns false', async () => {
    mockBeds24({
      calendarEntries: [
        { from: '2026-10-21', to: '2026-10-25', price1: 700 },
      ],
      availability: {
        '2026-10-22': false,
        '2026-10-23': false,
        '2026-10-24': false,
        '2026-10-25': true,
      },
    })

    const response = await GET(getRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    const oct22 = body.prices.find((p: { date: string }) => p.date === '2026-10-22')
    const oct23 = body.prices.find((p: { date: string }) => p.date === '2026-10-23')
    const oct24 = body.prices.find((p: { date: string }) => p.date === '2026-10-24')
    const oct25 = body.prices.find((p: { date: string }) => p.date === '2026-10-25')

    expect(oct22).toMatchObject({ date: '2026-10-22', numAvail: 0 })
    expect(oct23).toMatchObject({ date: '2026-10-23', numAvail: 0 })
    expect(oct24).toMatchObject({ date: '2026-10-24', numAvail: 0 })
    expect(oct25).toMatchObject({ date: '2026-10-25', numAvail: 1 })
  })

  it('preserves Beds24 numAvail:0 even when availability_cache has stale num_avail:1', async () => {
    // Regression for production bug: Beds24 has dates blocked, but availability_cache
    // has rows with num_avail: 1.
    mockBeds24({
      calendarEntries: [
        { from: '2026-10-22', to: '2026-10-23', price1: 700 },
      ],
      availability: {
        '2026-10-22': false,
        '2026-10-23': false,
      },
    })
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: 'user-1', room_id: String(BEDS24_ROOM_ID), date: '2026-10-22', num_avail: 1, is_manual_block: false },
        { user_id: 'user-1', room_id: String(BEDS24_ROOM_ID), date: '2026-10-23', num_avail: 1, is_manual_block: false },
      ],
    })

    const response = await GET(getRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    const oct22 = body.prices.find((p: { date: string }) => p.date === '2026-10-22')
    const oct23 = body.prices.find((p: { date: string }) => p.date === '2026-10-23')

    expect(oct22).toMatchObject({ date: '2026-10-22', numAvail: 0 })
    expect(oct23).toMatchObject({ date: '2026-10-23', numAvail: 0 })
  })

  it('injects a synthetic blocked entry for a date with no Beds24 price at all', async () => {
    mockBeds24({ calendarEntries: [{ from: '2026-07-11', to: '2026-07-15', price1: 600 }] })
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: 'user-1', room_id: String(BEDS24_ROOM_ID), date: '2026-09-01', num_avail: 0 },
      ],
    })

    const response = await GET(getRequest())
    const body = await response.json()
    const sep1 = body.prices.find((p: { date: string }) => p.date === '2026-09-01')
    expect(sep1).toMatchObject({ date: '2026-09-01', numAvail: 0 })
  })
})

describe('Full round-trip — block then unblock', () => {
  it('blocks a date, confirms GET shows it blocked, then unblocks and confirms GET shows it open', async () => {
    mockBeds24({
      calendarEntries: [{ from: '2026-07-11', to: '2026-07-15', price1: 600 }],
      postCalendarEcho: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 0 }],
    })

    // 1. Block July 12
    const blockPayload = [
      { roomId: BEDS24_ROOM_ID, calendar: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 0, price1: 600 }] },
    ]
    const blockResponse = await POST(postRequest(blockPayload))
    expect(blockResponse.status).toBe(200)

    // 2. GET must show it blocked
    const afterBlock = await GET(getRequest())
    const afterBlockBody = await afterBlock.json()
    expect(afterBlockBody.prices.find((p: { date: string }) => p.date === '2026-07-12')).toMatchObject({
      numAvail: 0,
    })

    // 3. Unblock July 12
    mockBeds24({
      calendarEntries: [{ from: '2026-07-11', to: '2026-07-15', price1: 600 }],
      postCalendarEcho: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 1 }],
    })
    const unblockPayload = [
      { roomId: BEDS24_ROOM_ID, calendar: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 1, price1: 600 }] },
    ]
    const unblockResponse = await POST(postRequest(unblockPayload))
    expect(unblockResponse.status).toBe(200)

    // 4. GET must show it open again
    const afterUnblock = await GET(getRequest())
    const afterUnblockBody = await afterUnblock.json()
    expect(afterUnblockBody.prices.find((p: { date: string }) => p.date === '2026-07-12')).toMatchObject({
      numAvail: 1,
    })
  })
})
