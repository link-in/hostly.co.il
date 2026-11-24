import { describe, expect, it } from 'vitest'
import { addDays } from '../domain/dates'
import type { AvailabilityDay } from '../domain/types'
import { customWindowDetector, MAX_WINDOW_NIGHTS } from './detectors/customWindow'
import { weekendDetector } from './detectors/weekend'
import { getDetector } from './registry'

// Tuesday. The next weekend nights are Thu 2026-11-26 and Fri 2026-11-27.
const TODAY = '2026-11-24'

function calendar(days: number, blocked: string[] = []): AvailabilityDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(TODAY, i)
    return { date, available: !blocked.includes(date), price: 500 }
  })
}

const rule = { daysBefore: 7, minFreeNights: 1 }

describe('weekendDetector', () => {
  it('finds the free Thursday–Friday nights of the coming weekend', () => {
    const result = weekendDetector.detect({ roomId: 'r1', today: TODAY, rule, days: calendar(30) })

    expect(result).toEqual([
      {
        trigger: 'weekend',
        roomId: 'r1',
        checkIn: '2026-11-26',
        checkOut: '2026-11-28',
        nights: [
          { date: '2026-11-26', price: 500 },
          { date: '2026-11-27', price: 500 },
        ],
      },
    ])
  })

  it('promotes only the free night when the other weekend night is booked', () => {
    const result = weekendDetector.detect({
      roomId: 'r1',
      today: TODAY,
      rule,
      days: calendar(30, ['2026-11-26']),
    })

    expect(result.map((o) => [o.checkIn, o.checkOut])).toEqual([['2026-11-27', '2026-11-28']])
  })

  it('skips a weekend with fewer free nights than required', () => {
    const result = weekendDetector.detect({
      roomId: 'r1',
      today: TODAY,
      rule: { daysBefore: 7, minFreeNights: 2 },
      days: calendar(30, ['2026-11-27']),
    })

    expect(result).toEqual([])
  })

  it('skips a fully booked weekend and treats missing dates as unavailable', () => {
    expect(
      weekendDetector.detect({ roomId: 'r1', today: TODAY, rule, days: calendar(30, ['2026-11-26', '2026-11-27']) }),
    ).toEqual([])
    expect(weekendDetector.detect({ roomId: 'r1', today: TODAY, rule, days: [] })).toEqual([])
  })

  it('looks at every weekend inside the daysBefore window', () => {
    const result = weekendDetector.detect({
      roomId: 'r1',
      today: TODAY,
      rule: { daysBefore: 14, minFreeNights: 1 },
      days: calendar(30),
    })

    expect(result.map((o) => o.checkIn)).toEqual(['2026-11-26', '2026-12-03'])
  })

  it('does not promote a weekend that starts today', () => {
    const thursday = '2026-11-26'
    const result = weekendDetector.detect({
      roomId: 'r1',
      today: thursday,
      rule: { daysBefore: 3, minFreeNights: 1 },
      days: calendar(30),
    })

    expect(result).toEqual([])
  })

  it('asks for availability through the end of the last weekend in range', () => {
    expect(weekendDetector.horizonEnd(TODAY, rule)).toBe('2026-12-03')
  })
})

describe('customWindowDetector', () => {
  it('reports each free run that starts inside the window once', () => {
    const result = customWindowDetector.detect({
      roomId: 'r1',
      today: TODAY,
      rule: { daysBefore: 7, minFreeNights: 2 },
      days: calendar(30, ['2026-11-27', '2026-11-28', '2026-11-30']),
    })

    expect(result.map((o) => [o.checkIn, o.checkOut])).toEqual([
      ['2026-11-25', '2026-11-27'],
      ['2026-12-01', '2026-12-15'],
    ])
  })

  it('caps a single campaign window at MAX_WINDOW_NIGHTS', () => {
    const result = customWindowDetector.detect({ roomId: 'r1', today: TODAY, rule, days: calendar(60) })

    expect(result[0].nights).toHaveLength(MAX_WINDOW_NIGHTS)
  })

  it('ignores runs shorter than minFreeNights', () => {
    const result = customWindowDetector.detect({
      roomId: 'r1',
      today: TODAY,
      rule: { daysBefore: 3, minFreeNights: 3 },
      days: calendar(30, ['2026-11-27']),
    })

    expect(result).toEqual([])
  })
})

describe('getDetector', () => {
  it('resolves every trigger to its detector', () => {
    expect(getDetector('weekend')).toBe(weekendDetector)
    expect(getDetector('custom_window')).toBe(customWindowDetector)
  })
})
