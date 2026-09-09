import { describe, it, expect } from 'vitest'
import {
  RESERVATION_PLATFORM_ICON_COLOR,
  getPlatformFallbackIconColor,
  usesChannelLogo,
} from './platformIcon'

describe('usesChannelLogo', () => {
  it('is true for Airbnb and Booking.com sources', () => {
    expect(usesChannelLogo('Airbnb')).toBe(true)
    expect(usesChannelLogo('airbnb.com')).toBe(true)
    expect(usesChannelLogo('Booking.com')).toBe(true)
    expect(usesChannelLogo('booking')).toBe(true)
  })

  it('is false for Direct and other fallback channels', () => {
    expect(usesChannelLogo('Direct')).toBe(false)
    expect(usesChannelLogo('ישירה')).toBe(false)
    expect(usesChannelLogo('Agoda')).toBe(false)
    expect(usesChannelLogo(null)).toBe(false)
    expect(usesChannelLogo(undefined)).toBe(false)
  })
})

describe('getPlatformFallbackIconColor', () => {
  it('uses the muted gray for Direct and unknown sources, not brand purple', () => {
    expect(getPlatformFallbackIconColor('Direct')).toBe(RESERVATION_PLATFORM_ICON_COLOR)
    expect(getPlatformFallbackIconColor('direct')).toBe(RESERVATION_PLATFORM_ICON_COLOR)
    expect(getPlatformFallbackIconColor(null)).toBe(RESERVATION_PLATFORM_ICON_COLOR)
    expect(getPlatformFallbackIconColor('Agoda')).toBe(RESERVATION_PLATFORM_ICON_COLOR)
    expect(getPlatformFallbackIconColor('Direct')).not.toBe('#7133D9')
  })

  it('keeps the same muted color for every fallback source', () => {
    expect(getPlatformFallbackIconColor('Direct')).toBe(getPlatformFallbackIconColor('Expedia'))
    expect(getPlatformFallbackIconColor('VRBO')).toBe(getPlatformFallbackIconColor(null))
  })
})
