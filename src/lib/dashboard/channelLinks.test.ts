import { describe, it, expect } from 'vitest'
import { buildChannelBookingUrl, channelLinkLabel } from './channelLinks'

describe('buildChannelBookingUrl', () => {
  it('builds an Airbnb host reservation URL from apiReference', () => {
    expect(buildChannelBookingUrl('Airbnb', 'HMABCD1234')).toBe(
      'https://www.airbnb.com/hosting/reservations/details/HMABCD1234',
    )
  })

  it('builds a Booking.com reservation URL for numeric references', () => {
    expect(buildChannelBookingUrl('Booking.com', '1234567890')).toBe(
      'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html?res_id=1234567890',
    )
  })

  it('returns null when there is no channel-specific reference', () => {
    expect(buildChannelBookingUrl('Airbnb', null)).toBeNull()
    expect(buildChannelBookingUrl('Airbnb', '   ')).toBeNull()
  })

  it('returns null for Booking.com non-numeric references', () => {
    expect(buildChannelBookingUrl('Booking.com', 'ABC-123')).toBeNull()
  })

  it('returns null for unsupported channels even with a reference', () => {
    expect(buildChannelBookingUrl('Direct', 'XYZ')).toBeNull()
  })
})

describe('channelLinkLabel', () => {
  it('returns Hebrew labels per channel', () => {
    expect(channelLinkLabel('Airbnb.com')).toBe('פתח באיירבנב')
    expect(channelLinkLabel('booking')).toBe('פתח ב-Booking.com')
    expect(channelLinkLabel('other')).toBe('פתח במקור ההזמנה')
  })
})
