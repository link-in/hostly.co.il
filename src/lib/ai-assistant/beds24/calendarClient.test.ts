import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { detectAndMarkCreditError } from '@/lib/beds24/creditGuard'
import { createFakeBeds24 } from '@/__tests__/helpers/fakeBeds24'
import {
  beds24AvailabilityResponse,
  beds24CalendarResponse,
  beds24PostSuccessResponse,
  BEDS24_PROPERTY_ID,
  BEDS24_ROOM_ID,
} from '@/__tests__/fixtures/beds24'
import { blockRoomDates, fetchRoomAvailability, fetchRoomPrices, updateRoomPrice } from './calendarClient'

vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: vi.fn() }))
vi.mock('@/lib/beds24/creditGuard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/beds24/creditGuard')>()),
  detectAndMarkCreditError: vi.fn(async () => false),
}))

const target = { userId: 'user-1', propertyId: BEDS24_PROPERTY_ID, roomId: BEDS24_ROOM_ID }
const range = { from: '2026-07-11', to: '2026-07-13' }

function useFakeBeds24(routes: Parameters<typeof createFakeBeds24>[0]) {
  const fake = createFakeBeds24(routes)
  vi.mocked(fetchWithTokenRefresh).mockImplementation(fake.fetchImpl as typeof fetchWithTokenRefresh)
  return fake
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchRoomAvailability', () => {
  it('queries the room range with the user id and no session tokens', async () => {
    const fake = useFakeBeds24({
      'GET /inventory/rooms/availability': { body: beds24AvailabilityResponse({ '2026-07-11': true, '2026-07-12': false }) },
    })

    const result = await fetchRoomAvailability(target, range)

    expect(result).toEqual({ ok: true, data: { '2026-07-11': true, '2026-07-12': false } })
    const [call] = fake.callsTo('GET', '/inventory/rooms/availability')
    expect(call.query).toEqual({
      propertyId: String(BEDS24_PROPERTY_ID),
      roomId: String(BEDS24_ROOM_ID),
      startDate: '2026-07-11',
      endDate: '2026-07-13',
    })
    expect(call.userId).toBe('user-1')
    expect(call.userTokens).toBeUndefined()
  })

  it('rejects an invalid range without calling Beds24', async () => {
    const fake = useFakeBeds24({})
    const result = await fetchRoomAvailability(target, { from: '2026-07-13', to: '2026-07-11' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid_input')
    expect(fake.calls).toHaveLength(0)
  })

  it('reports an unrecognised response shape', async () => {
    useFakeBeds24({ 'GET /inventory/rooms/availability': { body: { success: true, data: 'oops' } } })
    const result = await fetchRoomAvailability(target, range)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid_response')
  })

  it('reports a network failure instead of throwing', async () => {
    vi.mocked(fetchWithTokenRefresh).mockRejectedValue(new Error('ECONNRESET'))
    const result = await fetchRoomAvailability(target, range)
    expect(result).toEqual({ ok: false, error: { kind: 'network', message: 'ECONNRESET', status: undefined } })
  })
})

describe('fetchRoomPrices', () => {
  it('requests prices and returns nightly overrides', async () => {
    const fake = useFakeBeds24({
      'GET /inventory/rooms/calendar': { body: beds24CalendarResponse([{ from: '2026-07-11', to: '2026-07-12', price1: 700 }]) },
    })

    const result = await fetchRoomPrices(target, range)

    expect(result).toEqual({ ok: true, data: { '2026-07-11': 700, '2026-07-12': 700 } })
    expect(fake.callsTo('GET', '/inventory/rooms/calendar')[0].query.includePrices).toBe('1')
  })

  it('classifies HTTP 402 as a credit error and records it', async () => {
    useFakeBeds24({ 'GET /inventory/rooms/calendar': { status: 402, body: { success: false, error: 'No credit' } } })
    const result = await fetchRoomPrices(target, range)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatchObject({ kind: 'credit', status: 402 })
    expect(detectAndMarkCreditError).toHaveBeenCalledWith(expect.any(Response), 'user-1')
  })

  it('classifies other HTTP errors as http', async () => {
    useFakeBeds24({ 'GET /inventory/rooms/calendar': { status: 500, body: { success: false, error: 'boom' } } })
    const result = await fetchRoomPrices(target, range)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatchObject({ kind: 'http', status: 500, message: 'boom' })
  })
})

describe('blockRoomDates', () => {
  it('posts numAvail 0 for the inclusive range', async () => {
    const fake = useFakeBeds24({
      'POST /inventory/rooms/calendar': { status: 201, body: beds24PostSuccessResponse([{ ...range, numAvail: 0 }]) },
    })

    const result = await blockRoomDates(target, range)

    expect(result.ok).toBe(true)
    const [call] = fake.callsTo('POST', '/inventory/rooms/calendar')
    expect(call.query).toEqual({ propertyId: String(BEDS24_PROPERTY_ID) })
    expect(call.body).toEqual([
      { roomId: BEDS24_ROOM_ID, propertyId: BEDS24_PROPERTY_ID, calendar: [{ from: '2026-07-11', to: '2026-07-13', numAvail: 0 }] },
    ])
  })

  it('treats a 201 with success:false as rejected', async () => {
    useFakeBeds24({
      'POST /inventory/rooms/calendar': { status: 201, body: [{ success: false, errors: [{ message: 'invalid roomId' }] }] },
    })
    const result = await blockRoomDates(target, range)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('rejected')
  })
})

describe('updateRoomPrice', () => {
  it('posts the base price as price1', async () => {
    const fake = useFakeBeds24({ 'POST /inventory/rooms/calendar': { status: 201, body: beds24PostSuccessResponse([]) } })

    const result = await updateRoomPrice(target, range, 800)

    expect(result.ok).toBe(true)
    expect(fake.callsTo('POST', '/inventory/rooms/calendar')[0].body).toEqual([
      { roomId: BEDS24_ROOM_ID, propertyId: BEDS24_PROPERTY_ID, calendar: [{ from: '2026-07-11', to: '2026-07-13', price1: 800 }] },
    ])
  })

  it.each([0, -50, Number.NaN])('rejects the price %s without calling Beds24', async (price) => {
    const fake = useFakeBeds24({})
    const result = await updateRoomPrice(target, range, price)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid_input')
    expect(fake.calls).toHaveLength(0)
  })
})
