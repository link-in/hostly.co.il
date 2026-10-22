import { MAX_AMENITIES } from '../amenities'

/**
 * Hebrew labels for Beds24 `featureCodes`. Codes without a label are skipped,
 * and codes mapping to the same label collapse into one amenity.
 */
const FEATURE_LABELS: Record<string, string> = {
  AIR_CONDITIONING: 'מיזוג אוויר',
  HEATING: 'חימום',
  HEATING_INDIVIDUAL: 'חימום',
  CEILING_FAN: 'מאוורר תקרה',
  FIREPLACE: 'אח',
  WIFI: 'Wi-Fi',
  INTERNET: 'Wi-Fi',
  INTERNET_WIFI: 'Wi-Fi',
  TV: 'טלוויזיה',
  TV_HD_32_PLUS: 'טלוויזיה',
  CABLE: 'ערוצי כבלים',
  TV_STREAMING: 'שירותי סטרימינג',
  KITCHEN: 'מטבח מאובזר',
  KITCHENETTE: 'מטבחון',
  KITCHEN_SUPPLIES: 'כלי מטבח',
  OVEN: 'תנור',
  STOVE: 'כיריים',
  REFRIGERATOR: 'מקרר',
  MICROWAVE: 'מיקרוגל',
  DISHWASHER: 'מדיח כלים',
  KETTLE: 'קומקום',
  COFFEE_MAKER: 'מכונת קפה',
  TABLES_AND_CHAIRS: 'פינת אוכל',
  WASHER: 'מכונת כביסה',
  DRYER: 'מייבש כביסה',
  IRON: 'מגהץ',
  HAIR_DRYER: 'מייבש שיער',
  LINENS: 'מצעים ומגבות',
  LUXORY_LINEN: 'מצעים איכותיים',
  TOWELS: 'מצעים ומגבות',
  BATH_OR_SHOWER: 'אמבטיה או מקלחת',
  HOT_TUB: "ג'קוזי",
  JACUZZI: "ג'קוזי",
  SAUNA: 'סאונה',
  POOL: 'בריכה',
  POOL_PRIVATE: 'בריכה פרטית',
  BALCONY: 'מרפסת',
  TERRACE: 'מרפסת',
  PATIO: 'פטיו',
  GARDEN: 'גינה',
  BBQ_PICNIC_AREA: 'פינת מנגל',
  BBQ_GRILL: 'פינת מנגל',
  PARKING: 'חניה',
  FREE_PARKING: 'חניה חינם',
  MOUNTAIN_VIEW: 'נוף להרים',
  SEA_VIEW: 'נוף לים',
  LAKE_VIEW: 'נוף לאגם',
  GARDEN_VIEW: 'נוף לגינה',
  POOL_VIEW: 'נוף לבריכה',
  ELEVATOR: 'מעלית',
  CRIB: 'עריסה לתינוק',
  HIGH_CHAIR: 'כיסא תינוק',
  CHILDREN_WELCOME: 'מתאים למשפחות',
  PETS_ALLOWED: 'מותר עם חיות מחמד',
  SMOKING_NOT_ALLOWED: 'ללא עישון',
}

/** Beds24 nests bed codes under a room: `["BEDROOM", "BED_DOUBLE"]`. */
function countGroupsStartingWith(groups: string[][], code: string): number {
  return groups.filter((group) => group[0] === code).length
}

function roomSummary(roomGroups: string[][]): string[] {
  const bedrooms = countGroupsStartingWith(roomGroups, 'BEDROOM')
  const bathrooms = countGroupsStartingWith(roomGroups, 'BATHROOM')
  const summary: string[] = []
  if (bedrooms === 1) summary.push('חדר שינה')
  if (bedrooms > 1) summary.push(`${bedrooms} חדרי שינה`)
  if (bathrooms === 1) summary.push('חדר רחצה')
  if (bathrooms > 1) summary.push(`${bathrooms} חדרי רחצה`)
  return summary
}

/** Amenity labels for the landing page: bedroom/bathroom summary, then room, then property features. */
export function toAmenityLabels(roomGroups: string[][], propertyGroups: string[][]): string[] {
  const labels = [...roomGroups, ...propertyGroups]
    .filter((group) => group.length === 1)
    .map(([code]) => FEATURE_LABELS[code])
    .filter((label): label is string => Boolean(label))

  return [...new Set([...roomSummary(roomGroups), ...labels])].slice(0, MAX_AMENITIES)
}
