import { describe, expect, it } from 'vitest'
import { extractCreatedIds, parseCreatedPropertyRoomIds } from '@/lib/onboarding/beds24Response'
import { hasBeds24Failure } from '@/lib/onboarding/beds24Client'
import { Beds24RequestError } from '@/lib/onboarding/errors'
import { buildPropertyPayload } from '@/lib/onboarding/steps/property'
import { buildBasePricePayload, buildBasePriceRange } from '@/lib/onboarding/steps/pricing'
import { toAirbnbListingSummary } from '@/lib/onboarding/steps/airbnb'
import { readAirbnbRoomStatus } from '@/lib/onboarding/steps/channels'
import { formatRoomIdValue } from '@/lib/onboarding/steps/clientRecords'
import {
  basePriceStepInputSchema,
  bookingComStepInputSchema,
  channelSettingsResponseSchema,
  propertyStepInputSchema,
} from '@/lib/onboarding/schemas'

describe('extractCreatedIds', () => {
  it('reads property and nested room IDs from a multi-item create response', () => {
    const body = [{ success: true, new: { id: 301, roomTypes: [{ id: 601 }] } }]
    expect(extractCreatedIds(body)).toEqual({ propertyId: '301', roomId: '601' })
  })

  it('reads flat propertyId / roomId shapes (Airbnb import)', () => {
    expect(extractCreatedIds([{ success: true, propertyId: 5, roomId: '9' }])).toEqual({ propertyId: '5', roomId: '9' })
    expect(extractCreatedIds({ data: { propertyId: 7, roomId: 8 } })).toEqual({ propertyId: '7', roomId: '8' })
  })

  it('reads nested property and room shapes returned by Airbnb import', () => {
    expect(extractCreatedIds([{ success: true, new: { property: { id: 401, roomTypes: [{ id: 801 }] } } }])).toEqual({
      propertyId: '401',
      roomId: '801',
    })
    expect(extractCreatedIds([{ success: true, new: { properties: [{ id: 402, rooms: [{ id: 802 }] }] } }])).toEqual({
      propertyId: '402',
      roomId: '802',
    })
  })

  it('returns only the property ID when no room is present', () => {
    expect(extractCreatedIds([{ new: { id: 301 } }])).toEqual({ propertyId: '301', roomId: undefined })
  })

  it('returns an empty object for unrecognised bodies', () => {
    expect(extractCreatedIds('oops')).toEqual({})
    expect(extractCreatedIds([])).toEqual({})
  })

  it('strict parser throws when an ID is missing', () => {
    expect(() => parseCreatedPropertyRoomIds([{ new: { id: 1 } }])).toThrow(Beds24RequestError)
  })
})

describe('hasBeds24Failure', () => {
  it('detects success:false on any item', () => {
    expect(hasBeds24Failure([{ success: true }, { success: false }])).toBe(true)
    expect(hasBeds24Failure({ success: false })).toBe(true)
  })

  it('treats bodies without success:false as OK', () => {
    expect(hasBeds24Failure([{ success: true }])).toBe(false)
    expect(hasBeds24Failure({ data: [] })).toBe(false)
    expect(hasBeds24Failure('text')).toBe(false)
  })
})

describe('buildPropertyPayload', () => {
  it('creates one property with a single nested room type', () => {
    expect(buildPropertyPayload({ name: 'Villa', propertyType: 'villa', maxPeople: 4, currency: 'ILS' })).toEqual([
      { name: 'Villa', propertyType: 'villa', currency: 'ILS', roomTypes: [{ name: 'Villa', qty: 1, maxPeople: 4 }] },
    ])
  })
})

describe('base price helpers', () => {
  it('builds a UTC date range of N months from today', () => {
    expect(buildBasePriceRange(12, new Date('2026-10-12T22:30:00Z'))).toEqual({ from: '2026-10-12', to: '2027-10-12' })
  })

  it('builds the calendar payload with price1, availability and minStay', () => {
    const payload = buildBasePricePayload(
      { roomId: '601', price: 500, minStay: 2, months: 12 },
      { from: '2026-10-12', to: '2027-10-12' },
    )
    expect(payload).toEqual([
      { roomId: 601, calendar: [{ from: '2026-10-12', to: '2027-10-12', price1: 500, numAvail: 1, minStay: 2 }] },
    ])
  })
})

describe('toAirbnbListingSummary', () => {
  it('normalises different listing field names', () => {
    expect(toAirbnbListingSummary({ id: 123, nickname: 'Loft', city: 'Haifa' })).toEqual({
      airbnbListingId: '123',
      name: 'Loft',
      address: 'Haifa',
      picture: undefined,
    })
  })

  it('normalises nested Beds24 airbnbListing payloads', () => {
    expect(toAirbnbListingSummary({
      airbnbListing: {
        listingId: '555',
        name: 'Villa on the river',
        address: { city: 'Dafna' },
        picture: 'https://example.test/listing.jpg',
      },
    })).toEqual({
      airbnbListingId: '555',
      name: 'Villa on the river',
      address: 'Dafna',
      picture: 'https://example.test/listing.jpg',
    })
  })

  it('falls back to a generated name and rejects listings without an ID', () => {
    expect(toAirbnbListingSummary({ listingId: '77' })?.name).toBe('מודעה 77')
    expect(toAirbnbListingSummary({ name: 'no id' })).toBeNull()
  })
})

describe('readAirbnbRoomStatus', () => {
  const settings = channelSettingsResponseSchema.parse({
    data: [{
      channel: 'airbnb',
      properties: [{ id: 301, multiplier: '1.21', roomTypes: [{ id: 601, enabled: true, airbnbListingId: 999 }] }],
    }],
  })

  it('reports connection, listing and multiplier for the client room', () => {
    expect(readAirbnbRoomStatus(settings, '301', '601')).toEqual({
      connected: true,
      airbnbListingId: '999',
      multiplier: 1.21,
    })
  })

  it('reports not connected for an unknown room', () => {
    expect(readAirbnbRoomStatus(settings, '301', '602')).toEqual({
      connected: false,
      airbnbListingId: null,
      multiplier: 1.21,
    })
  })
})

describe('formatRoomIdValue', () => {
  it('uses the id:name convention when a name exists', () => {
    expect(formatRoomIdValue('601', 'Villa')).toBe('601:Villa')
    expect(formatRoomIdValue('601')).toBe('601')
  })
})

describe('step input schemas', () => {
  it('applies property defaults in create mode', () => {
    expect(propertyStepInputSchema.parse({ mode: 'create', name: '  Villa  ' })).toEqual({
      mode: 'create',
      name: 'Villa',
      propertyType: 'apartment',
      maxPeople: 2,
      currency: 'ILS',
    })
  })

  it('rejects non-numeric Airbnb IDs in import mode', () => {
    const result = propertyStepInputSchema.safeParse({ mode: 'importAirbnb', airbnbUserId: 'abc', airbnbListingId: '1' })
    expect(result.success).toBe(false)
  })

  it('validates base price bounds', () => {
    expect(basePriceStepInputSchema.safeParse({ price: 0 }).success).toBe(false)
    expect(basePriceStepInputSchema.parse({ price: 450 })).toEqual({ price: 450, minStay: 1, months: 12 })
  })

  it('accepts an empty or numeric Booking.com hotel ID only', () => {
    expect(bookingComStepInputSchema.safeParse({ hotelId: '' }).success).toBe(true)
    expect(bookingComStepInputSchema.safeParse({ hotelId: '12a' }).success).toBe(false)
  })
})
