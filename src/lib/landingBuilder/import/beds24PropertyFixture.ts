import { beds24PropertySchema, type Beds24Property } from './beds24Property'

/** Trimmed copy of a real Beds24 V2 `GET /properties` item (property 306559, Oct 2026). */
export const BEDS24_PROPERTY_RAW = {
  id: 306559,
  name: 'נוף הרים בדפנה',
  propertyType: 'vacationHome',
  currency: 'ILS',
  city: 'Dafna',
  featureCodes: [['BBQ_PICNIC_AREA'], ['SMOKING_NOT_ALLOWED'], ['AIR_CONDITIONING']],
  texts: [
    {
      language: 'en',
      headline: '',
      propertyDescription: '',
      propertyDescription1:
        '<span style="color: rgb(102, 102, 102); font-family: \'Open Sans\';">Mountain view cabin&nbsp;in Dafna.</span><br>Close to the Dan river.',
    },
  ],
  roomTypes: [
    {
      id: 638851,
      propertyId: 306559,
      name: 'נוף הרים בדפנה',
      maxPeople: 5,
      minPrice: 0,
      rackRate: 850,
      featureCodes: [
        ['KITCHEN_SUPPLIES'],
        ['TV'],
        ['TV_HD_32_PLUS'],
        ['MOUNTAIN_VIEW'],
        ['AIR_CONDITIONING'],
        ['BATHROOM'],
        ['BEDROOM', 'BED_SINGLE', 'BED_SINGLE'],
        ['BEDROOM', 'BED_DOUBLE'],
        ['SOME_UNMAPPED_CODE'],
      ],
      texts: [
        {
          language: 'de',
          displayName: '',
          contentHeadline: '',
          contentDescription: '',
        },
        {
          language: 'he',
          displayName: 'נוף הרים בדפנה',
          contentHeadline: 'נוף הרים בדפנה',
          roomDescription: '',
          contentDescription:
            'יחידת האירוח שלנו בדפנה מציעה לכם חוויה מושלמת בין פלגי הדן אל מול נופי חרמון. היחידה מאובזרת בכל מה שצריך לנוחות מקסימלית.',
        },
        {
          language: 'en',
          displayName: '',
          contentHeadline: '',
          contentDescription: '',
        },
      ],
    },
  ],
}

export function buildBeds24Property(overrides: Partial<typeof BEDS24_PROPERTY_RAW> = {}): Beds24Property {
  return beds24PropertySchema.parse({ ...BEDS24_PROPERTY_RAW, ...overrides })
}
