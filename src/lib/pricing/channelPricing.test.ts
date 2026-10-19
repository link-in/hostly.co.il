import { describe, it, expect } from 'vitest'
import {
  calculateChannelPrices,
  AIRBNB_PRICE_MULTIPLIER,
  BOOKING_PRICE_MULTIPLIER,
  DIRECT_PRICE_MULTIPLIER,
} from './channelPricing'

describe('channelPricing', () => {
  it('implements 1.21 multiplier for Airbnb', () => {
    expect(AIRBNB_PRICE_MULTIPLIER).toBe(1.21)
  })

  it('implements 1.21 multiplier for Booking.com', () => {
    expect(BOOKING_PRICE_MULTIPLIER).toBe(1.21)
  })

  it('implements 1.00 multiplier for Direct', () => {
    expect(DIRECT_PRICE_MULTIPLIER).toBe(1.0)
  })

  it('correctly calculates prices for 1000 ILS base price', () => {
    const channels = calculateChannelPrices(1000)

    const airbnb = channels.find((c) => c.channelKey === 'airbnb')
    const booking = channels.find((c) => c.channelKey === 'booking')
    const direct = channels.find((c) => c.channelKey === 'direct')

    expect(airbnb).toBeDefined()
    expect(airbnb?.price).toBe(1210)
    expect(airbnb?.markupPercent).toBe(21)

    expect(booking).toBeDefined()
    expect(booking?.price).toBe(1210)
    expect(booking?.markupPercent).toBe(21)

    expect(direct).toBeDefined()
    expect(direct?.price).toBe(1000)
    expect(direct?.markupPercent).toBe(0)
  })

  it('handles rounding cleanly for odd base prices', () => {
    // 555 * 1.21 = 671.55 -> rounds to 672
    const channels = calculateChannelPrices(555)
    const airbnb = channels.find((c) => c.channelKey === 'airbnb')
    expect(airbnb?.price).toBe(672)
  })

  it('handles 0 or negative base price gracefully', () => {
    const channels = calculateChannelPrices(0)
    expect(channels.every((c) => c.price === 0)).toBe(true)

    const negativeChannels = calculateChannelPrices(-50)
    expect(negativeChannels.every((c) => c.price === 0)).toBe(true)
  })
})
