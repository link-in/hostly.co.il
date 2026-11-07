import { describe, it, expect } from 'vitest'
import { resolveNumAvail } from './syncRules'

describe('resolveNumAvail', () => {
  it('blocks a booked night even when Beds24 reports it as available', () => {
    expect(resolveNumAvail({ bookedNight: true, beds24NumAvail: 1, manuallyBlockedInCache: false })).toBe(0)
  })

  it('trusts Beds24 when it reports a manual block', () => {
    expect(resolveNumAvail({ bookedNight: false, beds24NumAvail: 0, manuallyBlockedInCache: false })).toBe(0)
  })

  it('trusts Beds24 when the date was released there, even if the cache still has a manual block', () => {
    expect(resolveNumAvail({ bookedNight: false, beds24NumAvail: 1, manuallyBlockedInCache: true })).toBe(1)
  })

  it('keeps the cached manual block when Beds24 did not return numAvail', () => {
    expect(resolveNumAvail({ bookedNight: false, beds24NumAvail: null, manuallyBlockedInCache: true })).toBe(0)
  })

  it('defaults to available when there is no information at all', () => {
    expect(resolveNumAvail({ bookedNight: false, beds24NumAvail: null, manuallyBlockedInCache: false })).toBe(1)
  })
})
