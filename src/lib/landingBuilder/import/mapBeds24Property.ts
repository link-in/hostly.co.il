import type { PropertyContent } from '../types'
import type { Beds24Property, Beds24Room } from './beds24Property'
import { toAmenityLabels } from './featureCodes'
import { firstSentence, pickLocalizedText } from './localizedText'

export interface PropertyImage {
  url: string
  alt: string
}

export interface MapPropertyInput {
  property: Beds24Property
  roomId: string | null
  images: PropertyImage[]
}

const ROOM_NAME_FIELDS = ['displayName'] as const
const ROOM_HEADLINE_FIELDS = ['contentHeadline', 'marketing'] as const
const ROOM_DESCRIPTION_FIELDS = ['contentDescription', 'roomDescription', 'auxiliary'] as const
const PROPERTY_HEADLINE_FIELDS = ['headline'] as const
const PROPERTY_DESCRIPTION_FIELDS = ['propertyDescription', 'propertyDescription1', 'propertyDescriptionBookingPage1'] as const

export function selectRoom(property: Beds24Property, roomId: string | null): Beds24Room | null {
  return property.roomTypes.find((room) => room.id === roomId) ?? property.roomTypes[0] ?? null
}

/** Direct-booking nightly price: the room's rack rate, else its minimum price. */
export function pickNightlyPrice(room: Beds24Room | null): number | null {
  if (room?.rackRate && room.rackRate > 0) return room.rackRate
  if (room?.minPrice && room.minPrice > 0) return room.minPrice
  return null
}

function pickName(property: Beds24Property, room: Beds24Room | null): string {
  return (
    pickLocalizedText(room?.texts ?? [], ROOM_NAME_FIELDS) ||
    room?.name?.trim() ||
    property.name?.trim() ||
    `נכס ${property.id}`
  )
}

function pickDescription(property: Beds24Property, room: Beds24Room | null): string {
  return (
    pickLocalizedText(room?.texts ?? [], ROOM_DESCRIPTION_FIELDS) ||
    pickLocalizedText(property.texts, PROPERTY_DESCRIPTION_FIELDS)
  )
}

/** A headline that just repeats the name adds nothing — fall back to the description's opening line. */
function pickHeadline(property: Beds24Property, room: Beds24Room | null, name: string, description: string): string {
  const headline =
    pickLocalizedText(room?.texts ?? [], ROOM_HEADLINE_FIELDS) ||
    pickLocalizedText(property.texts, PROPERTY_HEADLINE_FIELDS)
  return headline && headline !== name ? headline : firstSentence(description)
}

/** Keep imported text within the draft's limits (`draftContentSchema`). */
const LIMITS = { name: 80, headline: 240, description: 4000 } as const
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trim()}…` : text)

function normalizeCurrency(currency: string | null | undefined): string {
  const code = currency?.trim().toUpperCase()
  return code && /^[A-Z]{3}$/.test(code) ? code : 'ILS'
}

export function mapBeds24Property({ property, roomId, images }: MapPropertyInput): PropertyContent {
  const room = selectRoom(property, roomId)
  const name = clip(pickName(property, room), LIMITS.name)
  const description = clip(pickDescription(property, room), LIMITS.description)

  return {
    propertyId: property.id,
    roomId: room?.id ?? null,
    name,
    headline: clip(pickHeadline(property, room, name, description), LIMITS.headline),
    description,
    city: property.city?.trim() ?? '',
    amenities: toAmenityLabels(room?.featureCodes ?? [], property.featureCodes),
    images,
    maxGuests: room?.maxPeople && room.maxPeople > 0 ? room.maxPeople : null,
    basePrice: pickNightlyPrice(room),
    currency: normalizeCurrency(property.currency),
  }
}
