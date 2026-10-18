import { describe, expect, it } from 'vitest'
import { getVisibleSections, pickActiveSectionId, shouldShowSubscription } from './sections'

describe('getVisibleSections', () => {
  it('shows every section for an owner with a property', () => {
    const ids = getVisibleSections({ hasProperty: true, showSubscription: true }).map((s) => s.id)
    expect(ids).toHaveLength(7)
  })

  it('hides Airbnb connection when there is no property', () => {
    const ids = getVisibleSections({ hasProperty: false, showSubscription: true }).map((s) => s.id)
    expect(ids).not.toContain('channels')
  })

  it('hides the subscription section when not applicable', () => {
    const ids = getVisibleSections({ hasProperty: true, showSubscription: false }).map((s) => s.id)
    expect(ids).not.toContain('subscription')
  })
})

describe('shouldShowSubscription', () => {
  it('is false for admins, demo users and missing sessions', () => {
    expect(shouldShowSubscription({ role: 'admin' })).toBe(false)
    expect(shouldShowSubscription({ role: 'owner', isDemo: true })).toBe(false)
    expect(shouldShowSubscription(undefined)).toBe(false)
  })

  it('is true for regular owners', () => {
    expect(shouldShowSubscription({ role: 'owner' })).toBe(true)
  })
})

describe('pickActiveSectionId', () => {
  const order = ['details', 'notifications', 'checkin']

  it('picks the first visible section in page order', () => {
    expect(pickActiveSectionId(order, new Set(['checkin', 'notifications']), 'details')).toBe('notifications')
  })

  it('keeps the previous section when nothing is visible', () => {
    expect(pickActiveSectionId(order, new Set(), 'checkin')).toBe('checkin')
  })
})
