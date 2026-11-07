import { describe, expect, it } from 'vitest'
import { MAX_AMENITIES, addAmenity, removeAmenity } from './amenities'

describe('addAmenity', () => {
  it('appends a trimmed amenity', () => {
    expect(addAmenity(['Wi-Fi'], '  חניה ')).toEqual(['Wi-Fi', 'חניה'])
  })

  it('ignores blanks and duplicates', () => {
    expect(addAmenity(['Wi-Fi'], '   ')).toEqual(['Wi-Fi'])
    expect(addAmenity(['Wi-Fi'], 'Wi-Fi')).toEqual(['Wi-Fi'])
  })

  it('stops at the maximum', () => {
    const full = Array.from({ length: MAX_AMENITIES }, (_, i) => `a${i}`)
    expect(addAmenity(full, 'extra')).toHaveLength(MAX_AMENITIES)
  })
})

describe('removeAmenity', () => {
  it('removes the given amenity only', () => {
    expect(removeAmenity(['Wi-Fi', 'חניה'], 'Wi-Fi')).toEqual(['חניה'])
  })
})
