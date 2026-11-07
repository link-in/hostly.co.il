import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import {
  extractAvailabilityMap,
  extractCalendarAvailabilityMap,
  findStillOpenDates,
  blockedDatesByRoom,
  bookableInBeds24,
  markUnsyncedBlocks,
  buildBlackoutPayload,
  verifyDatesBlocked,
  findUnappliedBlocks,
  pushBlackout,
} from './sync'

vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: vi.fn() }))

const ROOM = '638851'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Beds24 answers: availability map per date, calendar entries per date. */
function mockBeds24State(sequence: Array<{ availability?: Record<string, boolean>; calendar?: unknown[] }>) {
  let call = 0
  vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url) => {
    const state = sequence[Math.min(Math.floor(call / 2), sequence.length - 1)]
    call += 1
    if ((url as string).includes('/inventory/rooms/availability')) {
      return jsonResponse({ success: true, data: [{ roomId: Number(ROOM), availability: state.availability ?? {} }] })
    }
    return jsonResponse({ success: true, data: [{ roomId: Number(ROOM), calendar: state.calendar ?? [] }] })
  })
}

beforeEach(() => {
  vi.mocked(fetchWithTokenRefresh).mockReset()
})

describe('extractAvailabilityMap', () => {
  it('reads the availability map and ignores other rooms', () => {
    const data = {
      data: [
        { roomId: 638851, availability: { '2026-10-22': false, '2026-10-23': true } },
        { roomId: 1, availability: { '2026-10-22': true } },
      ],
    }
    expect(extractAvailabilityMap(data, ROOM)).toEqual({ '2026-10-22': false, '2026-10-23': true })
  })
})

describe('extractCalendarAvailabilityMap', () => {
  it('treats blackout (any case) and numAvail <= 0 as closed, numAvail > 0 as open, and skips price-only rows', () => {
    const data = {
      data: [
        {
          roomId: 638851,
          calendar: [
            { from: '2026-10-22', to: '2026-10-23', override: 'Blackout', numAvail: 1 },
            { from: '2026-10-24', to: '2026-10-24', numAvail: -1 },
            { from: '2026-10-25', to: '2026-10-25', numAvail: 1, override: 'none' },
            { from: '2026-10-26', to: '2026-10-26', price1: 500 },
          ],
        },
      ],
    }
    expect(extractCalendarAvailabilityMap(data, ROOM)).toEqual({
      '2026-10-22': false,
      '2026-10-23': false,
      '2026-10-24': false,
      '2026-10-25': true,
    })
  })

  it('supports flat single-day entries', () => {
    const data = { data: [{ roomId: 638851, date: '2026-10-22', numAvail: 0 }] }
    expect(extractCalendarAvailabilityMap(data, ROOM)).toEqual({ '2026-10-22': false })
  })
})

describe('findStillOpenDates', () => {
  it('reports a date open only with positive evidence and no source saying blocked', () => {
    const state = {
      availability: { a: true, b: true, c: false },
      calendar: { b: false, d: true },
    }
    expect(findStillOpenDates(['a', 'b', 'c', 'd', 'unknown'], state)).toEqual(['a', 'd'])
  })
})

describe('blockedDatesByRoom', () => {
  it('collects blackout and numAvail<=0 dates per room, expanding ranges and skipping opens', () => {
    const payload = [
      {
        roomId: 638851,
        calendar: [
          { from: '2026-10-22', to: '2026-10-23', numAvail: 0, override: 'blackout' },
          { from: '2026-10-25', to: '2026-10-25', numAvail: 1, override: 'none' },
          { from: '2026-10-26', override: 'BLACKOUT' },
        ],
      },
      { calendar: [{ from: '2026-11-01', to: '2026-11-01', numAvail: 0 }] },
    ]
    expect(blockedDatesByRoom(payload, '999')).toEqual({
      '638851': ['2026-10-22', '2026-10-23', '2026-10-26'],
      '999': ['2026-11-01'],
    })
  })

  it('returns nothing for a pure price update', () => {
    expect(blockedDatesByRoom([{ roomId: 1, calendar: [{ from: '2026-10-22', to: '2026-10-25', price1: 600, numAvail: 1 }] }])).toEqual({})
  })
})

describe('bookableInBeds24 / markUnsyncedBlocks', () => {
  const beds24Prices = [
    { date: '2026-10-22', numAvail: 1, price: 700 },
    { date: '2026-10-23', numAvail: 0, price: 700 },
  ]

  it('only trusts availability=true when Beds24 calendar does not show the date blocked', () => {
    expect(bookableInBeds24(beds24Prices, { '2026-10-22': true, '2026-10-23': true, '2026-10-24': false })).toEqual({
      '2026-10-22': true,
    })
  })

  it('flags dates shown blocked in Hostly but bookable in Beds24', () => {
    const overlaid = [
      { date: '2026-10-22', numAvail: 0, price: 700 },
      { date: '2026-10-23', numAvail: 0, price: 700 },
      { date: '2026-10-24', numAvail: 1, price: 700 },
    ]
    const marked = markUnsyncedBlocks(overlaid, { '2026-10-22': true, '2026-10-24': true })
    expect(marked[0]).toMatchObject({ date: '2026-10-22', unsynced: true })
    expect(marked[1]).not.toHaveProperty('unsynced')
    expect(marked[2]).not.toHaveProperty('unsynced')
  })
})

describe('buildBlackoutPayload', () => {
  it('sends one blackout entry per date', () => {
    expect(buildBlackoutPayload(ROOM, ['2026-10-22'])).toEqual([
      { roomId: 638851, calendar: [{ from: '2026-10-22', to: '2026-10-22', numAvail: 0, override: 'blackout' }] },
    ])
  })
})

describe('verifyDatesBlocked', () => {
  it('returns [] when Beds24 already reports the dates closed', async () => {
    mockBeds24State([{ availability: { '2026-10-22': false } }])
    await expect(verifyDatesBlocked({ roomId: ROOM }, ['2026-10-22'], 0)).resolves.toEqual([])
  })

  it('re-checks once and returns [] when Beds24 catches up', async () => {
    mockBeds24State([{ availability: { '2026-10-22': true } }, { availability: { '2026-10-22': false } }])
    await expect(verifyDatesBlocked({ roomId: ROOM }, ['2026-10-22'], 0)).resolves.toEqual([])
    expect(fetchWithTokenRefresh).toHaveBeenCalledTimes(4)
  })

  it('returns the dates still open after the re-check', async () => {
    mockBeds24State([{ availability: { '2026-10-22': true, '2026-10-23': false } }])
    await expect(verifyDatesBlocked({ roomId: ROOM }, ['2026-10-22', '2026-10-23'], 0)).resolves.toEqual(['2026-10-22'])
  })

  it('returns null (unknown) when Beds24 cannot be read at all', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(jsonResponse({ error: 'down' }, 500))
    await expect(verifyDatesBlocked({ roomId: ROOM }, ['2026-10-22'], 0)).resolves.toBeNull()
  })

  it('queries Beds24 for the room and date span with numAvail and overrides', async () => {
    mockBeds24State([{ availability: { '2026-10-22': false, '2026-10-24': false } }])
    await verifyDatesBlocked({ roomId: ROOM, propertyId: '306559' }, ['2026-10-24', '2026-10-22'], 0)
    const urls = vi.mocked(fetchWithTokenRefresh).mock.calls.map((call) => new URL(call[0] as string))
    const calendarUrl = urls.find((url) => url.pathname.endsWith('/inventory/rooms/calendar'))!
    expect(calendarUrl.searchParams.get('roomId')).toBe(ROOM)
    expect(calendarUrl.searchParams.get('startDate')).toBe('2026-10-22')
    expect(calendarUrl.searchParams.get('endDate')).toBe('2026-10-24')
    expect(calendarUrl.searchParams.get('includeNumAvail')).toBe('1')
    expect(calendarUrl.searchParams.get('includeOverrides')).toBe('1')
  })
})

describe('findUnappliedBlocks', () => {
  it('returns only rooms with dates still open, ignoring non-block entries', async () => {
    mockBeds24State([{ availability: { '2026-10-22': true, '2026-10-23': false } }])
    const payload = [
      {
        roomId: 638851,
        calendar: [
          { from: '2026-10-22', to: '2026-10-23', numAvail: 0, override: 'blackout' },
          { from: '2026-10-25', to: '2026-10-25', numAvail: 1 },
        ],
      },
    ]
    await expect(findUnappliedBlocks(payload, { userId: 'user-1' }, 0)).resolves.toEqual({ '638851': ['2026-10-22'] })
  })

  it('does not call Beds24 when the payload has no blocks', async () => {
    await expect(findUnappliedBlocks([{ roomId: 1, calendar: [{ from: '2026-10-22', price1: 5 }] }], {})).resolves.toEqual({})
    expect(fetchWithTokenRefresh).not.toHaveBeenCalled()
  })
})

describe('pushBlackout', () => {
  it('is false when Beds24 answers 201 with success:false', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(jsonResponse([{ success: false, errors: [{ message: 'invalid roomId' }] }], 201))
    await expect(pushBlackout({ roomId: ROOM }, ['2026-10-22'])).resolves.toBe(false)
  })

  it('is true when Beds24 accepts the blackout', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(jsonResponse([{ success: true }], 201))
    await expect(pushBlackout({ roomId: ROOM }, ['2026-10-22'])).resolves.toBe(true)
    const body = JSON.parse(vi.mocked(fetchWithTokenRefresh).mock.calls[0][1]!.body as string)
    expect(body[0].calendar[0]).toMatchObject({ numAvail: 0, override: 'blackout' })
  })
})
