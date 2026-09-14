import { describe, expect, it } from 'vitest'
import { isDashboardNavPageVisible, LANDING_EDITOR_ENABLED } from './landingEditor'

describe('LANDING_EDITOR_ENABLED', () => {
  it('is off while the landing editor is hidden (HOS-17)', () => {
    expect(LANDING_EDITOR_ENABLED).toBe(false)
  })
})

describe('isDashboardNavPageVisible', () => {
  it('hides the landing editor nav item when the flag is off', () => {
    expect(isDashboardNavPageVisible('landing', false)).toBe(false)
  })

  it('shows the landing editor nav item when the flag is on', () => {
    expect(isDashboardNavPageVisible('landing', true)).toBe(true)
  })

  it('leaves every other dashboard page visible', () => {
    expect(isDashboardNavPageVisible('api-keys', false)).toBe(true)
    expect(isDashboardNavPageVisible('dashboard', false)).toBe(true)
    expect(isDashboardNavPageVisible(undefined, false)).toBe(true)
  })
})
