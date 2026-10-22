import { describe, expect, it } from 'vitest'
import { MAX_AMENITIES } from '../amenities'
import { toAmenityLabels } from './featureCodes'

describe('toAmenityLabels', () => {
  it('maps known codes to Hebrew labels and skips unknown ones', () => {
    expect(toAmenityLabels([['AIR_CONDITIONING'], ['NOT_A_REAL_CODE']], [])).toEqual(['מיזוג אוויר'])
  })

  it('collapses codes that share a label and dedupes room vs property', () => {
    expect(toAmenityLabels([['TV'], ['TV_HD_32_PLUS'], ['AIR_CONDITIONING']], [['AIR_CONDITIONING']])).toEqual([
      'טלוויזיה',
      'מיזוג אוויר',
    ])
  })

  it('summarizes bedrooms and bathrooms first', () => {
    const room = [['KITCHEN'], ['BEDROOM', 'BED_DOUBLE'], ['BEDROOM', 'BED_SINGLE'], ['BATHROOM']]
    expect(toAmenityLabels(room, [])).toEqual(['2 חדרי שינה', 'חדר רחצה', 'מטבח מאובזר'])
  })

  it('lists room features before property features', () => {
    expect(toAmenityLabels([['KITCHEN']], [['BBQ_PICNIC_AREA']])).toEqual(['מטבח מאובזר', 'פינת מנגל'])
  })

  it('caps the list at the amenity maximum', () => {
    const many = ['AIR_CONDITIONING', 'TV', 'CABLE', 'KITCHEN', 'OVEN', 'STOVE', 'REFRIGERATOR', 'MICROWAVE', 'DISHWASHER',
      'KETTLE', 'COFFEE_MAKER', 'WASHER', 'DRYER', 'IRON', 'HAIR_DRYER', 'LINENS', 'BATH_OR_SHOWER', 'HOT_TUB', 'SAUNA',
      'POOL', 'BALCONY', 'GARDEN', 'PARKING', 'MOUNTAIN_VIEW', 'SEA_VIEW', 'ELEVATOR', 'CRIB', 'HIGH_CHAIR',
      'PETS_ALLOWED', 'SMOKING_NOT_ALLOWED', 'FIREPLACE', 'CEILING_FAN'].map((code) => [code])
    expect(toAmenityLabels(many, [])).toHaveLength(MAX_AMENITIES)
  })
})
