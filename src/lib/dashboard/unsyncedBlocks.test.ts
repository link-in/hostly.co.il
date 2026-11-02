import { describe, it, expect } from 'vitest'
import { formatShortDate, getUnsyncedBlockedDates, dateFromKey } from './unsyncedBlocks'

describe('unsyncedBlocks', () => {
  it('formats YYYY-MM-DD as DD/MM', () => {
    expect(formatShortDate('2026-10-04')).toBe('04/10')
  })

  it('returns sorted unique unsynced dates from today onwards', () => {
    const prices = [
      { date: '2026-10-25', price: 1, numAvail: 0, unsynced: true },
      { date: '2026-10-22', price: 1, numAvail: 0, unsynced: true },
      { date: '2026-10-22', price: 1, numAvail: 0, unsynced: true },
      { date: '2026-10-19', price: 1, numAvail: 0, unsynced: true },
      { date: '2026-10-23', price: 1, numAvail: 0 },
    ]
    expect(getUnsyncedBlockedDates(prices, '2026-10-21')).toEqual(['2026-10-22', '2026-10-25'])
  })

  it('builds a local-midnight date from a key', () => {
    const date = dateFromKey('2026-10-22')
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 22, 0])
  })
})
