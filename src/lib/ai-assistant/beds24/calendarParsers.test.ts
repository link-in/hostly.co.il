import { describe, it, expect } from 'vitest'
import {
  beds24AvailabilityResponse,
  beds24CalendarResponse,
  BEDS24_ROOM_ID,
} from '@/__tests__/fixtures/beds24'
import { parseAvailabilityResponse, parseCalendarPricesResponse } from './calendarParsers'

const july = { from: '2026-07-01', to: '2026-07-31' }

describe('parseAvailabilityResponse', () => {
  it('maps the availability record for the requested room', () => {
    const body = beds24AvailabilityResponse({ '2026-07-11': true, '2026-07-12': false })
    expect(parseAvailabilityResponse(body, BEDS24_ROOM_ID, july)).toEqual({ '2026-07-11': true, '2026-07-12': false })
  })

  it('treats numeric availability as units left', () => {
    const body = beds24AvailabilityResponse({}) as { data: Record<string, unknown>[] }
    body.data[0].availability = { '2026-07-11': 2, '2026-07-12': 0 }
    expect(parseAvailabilityResponse(body, BEDS24_ROOM_ID, july)).toEqual({ '2026-07-11': true, '2026-07-12': false })
  })

  it('ignores other rooms and dates outside the range', () => {
    const body = {
      data: [
        { roomId: BEDS24_ROOM_ID, availability: { '2026-07-11': true, '2026-08-01': true } },
        { roomId: 999, availability: { '2026-07-12': false } },
      ],
    }
    expect(parseAvailabilityResponse(body, BEDS24_ROOM_ID, july)).toEqual({ '2026-07-11': true })
  })

  it('returns null for an unrecognised shape', () => {
    expect(parseAvailabilityResponse({ error: 'nope' }, BEDS24_ROOM_ID, july)).toBeNull()
    expect(parseAvailabilityResponse(undefined, BEDS24_ROOM_ID, july)).toBeNull()
  })
})

describe('parseCalendarPricesResponse', () => {
  it('expands inclusive price ranges into nightly prices', () => {
    const body = beds24CalendarResponse([
      { from: '2026-07-11', to: '2026-07-13', price1: 600 },
      { from: '2026-07-14', to: '2026-07-14', price1: 850 },
    ])
    expect(parseCalendarPricesResponse(body, BEDS24_ROOM_ID, july)).toEqual({
      '2026-07-11': 600,
      '2026-07-12': 600,
      '2026-07-13': 600,
      '2026-07-14': 850,
    })
  })

  it('clips ranges to the requested window', () => {
    const body = beds24CalendarResponse([{ from: '2026-06-29', to: '2026-07-02', price1: 500 }])
    expect(parseCalendarPricesResponse(body, BEDS24_ROOM_ID, july)).toEqual({ '2026-07-01': 500, '2026-07-02': 500 })
  })

  it('skips entries without a positive price', () => {
    const body = { data: [{ roomId: BEDS24_ROOM_ID, calendar: [{ from: '2026-07-11', to: '2026-07-12', price1: 0 }, { from: '2026-07-13', numAvail: 0 }] }] }
    expect(parseCalendarPricesResponse(body, BEDS24_ROOM_ID, july)).toEqual({})
  })

  it('returns null for an unrecognised shape', () => {
    expect(parseCalendarPricesResponse({ data: 'x' }, BEDS24_ROOM_ID, july)).toBeNull()
  })
})
