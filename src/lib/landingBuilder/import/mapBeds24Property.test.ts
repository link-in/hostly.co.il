import { describe, expect, it } from 'vitest'
import { propertyContentSchema } from '../types'
import { BEDS24_PROPERTY_RAW, buildBeds24Property } from './beds24PropertyFixture'
import { mapBeds24Property, pickNightlyPrice, selectRoom } from './mapBeds24Property'

const images = [{ url: 'https://example.supabase.co/storage/v1/object/public/landing-images/a.jpg', alt: 'נוף' }]
const [rawRoom] = BEDS24_PROPERTY_RAW.roomTypes

describe('mapBeds24Property — real Beds24 shape', () => {
  const content = mapBeds24Property({ property: buildBeds24Property(), roomId: '638851', images })

  it('produces valid import content', () => {
    expect(propertyContentSchema.safeParse(content).success).toBe(true)
  })

  it('uses ids as strings and keeps the requested room', () => {
    expect(content.propertyId).toBe('306559')
    expect(content.roomId).toBe('638851')
  })

  it('takes the Hebrew room name and description', () => {
    expect(content.name).toBe('נוף הרים בדפנה')
    expect(content.description).toMatch(/^יחידת האירוח שלנו בדפנה/)
  })

  it('replaces a headline that repeats the name with the description opening line', () => {
    expect(content.headline).toBe('יחידת האירוח שלנו בדפנה מציעה לכם חוויה מושלמת בין פלגי הדן אל מול נופי חרמון.')
  })

  it('maps amenities from room and property feature codes', () => {
    expect(content.amenities).toEqual([
      '2 חדרי שינה',
      'חדר רחצה',
      'כלי מטבח',
      'טלוויזיה',
      'נוף להרים',
      'מיזוג אוויר',
      'פינת מנגל',
      'ללא עישון',
    ])
  })

  it('carries booking basics and images', () => {
    expect(content.basePrice).toBe(850)
    expect(content.maxGuests).toBe(5)
    expect(content.currency).toBe('ILS')
    expect(content.city).toBe('Dafna')
    expect(content.images).toEqual(images)
  })
})

describe('mapBeds24Property — fallbacks', () => {
  it('falls back to the property description (HTML stripped) when the room has none', () => {
    const property = buildBeds24Property({ roomTypes: [{ ...rawRoom, texts: [] }] })
    const content = mapBeds24Property({ property, roomId: null, images: [] })
    expect(content.description).toBe('Mountain view cabin in Dafna.\nClose to the Dan river.')
    expect(content.name).toBe('נוף הרים בדפנה')
  })

  it('names a nameless property by id', () => {
    const property = buildBeds24Property({ name: undefined, roomTypes: [] })
    expect(mapBeds24Property({ property, roomId: null, images: [] }).name).toBe('נכס 306559')
  })

  it('defaults an invalid currency to ILS', () => {
    const property = buildBeds24Property({ currency: 'shekel' })
    expect(mapBeds24Property({ property, roomId: null, images: [] }).currency).toBe('ILS')
  })

  it('clips very long descriptions to the draft limit', () => {
    const long = 'א'.repeat(5000)
    const property = buildBeds24Property({
      roomTypes: [{ ...rawRoom, texts: [{ language: 'he', displayName: 'x', contentHeadline: 'כותרת', contentDescription: long }] }],
    })
    expect(mapBeds24Property({ property, roomId: null, images: [] }).description.length).toBeLessThanOrEqual(4000)
  })
})

describe('selectRoom', () => {
  const property = buildBeds24Property({ roomTypes: [rawRoom, { ...rawRoom, id: 672381, name: 'חדר שני' }] })

  it('picks the requested room', () => {
    expect(selectRoom(property, '672381')?.name).toBe('חדר שני')
  })

  it('falls back to the first room for an unknown id', () => {
    expect(selectRoom(property, '999')?.id).toBe('638851')
  })
})

describe('pickNightlyPrice', () => {
  const room = buildBeds24Property().roomTypes[0]

  it('prefers the rack rate', () => {
    expect(pickNightlyPrice({ ...room, rackRate: 850, minPrice: 500 })).toBe(850)
  })

  it('falls back to the minimum price, then null', () => {
    expect(pickNightlyPrice({ ...room, rackRate: 0, minPrice: 500 })).toBe(500)
    expect(pickNightlyPrice({ ...room, rackRate: 0, minPrice: 0 })).toBeNull()
    expect(pickNightlyPrice(null)).toBeNull()
  })
})
