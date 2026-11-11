import { z } from 'zod'

export const MAX_AVAILABILITY_NIGHTS = 92

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

const propertyId = z
  .number()
  .int()
  .positive()
  .optional()
  .describe('Beds24 property ID from list_properties. Omit when the user has a single property.')

const roomId = z
  .number()
  .int()
  .positive()
  .optional()
  .describe('Beds24 room ID from list_properties. Omit to cover every room of the property.')

export const listPropertiesInputSchema = z.object({})

export const checkAvailabilityInputSchema = z.object({
  property_id: propertyId,
  room_id: roomId,
  start_date: isoDate.describe('Check-in date, YYYY-MM-DD.'),
  end_date: isoDate.describe('Check-out date, YYYY-MM-DD. Exclusive: the night of this date is NOT included.'),
})

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilityInputSchema>

export const MAX_NIGHTLY_PRICE = 50_000

const writeRoomId = roomId.describe('Beds24 room ID from list_properties. Required when the property has several rooms.')

const writeStay = {
  property_id: propertyId,
  room_id: writeRoomId,
  start_date: isoDate.describe('First night to change, YYYY-MM-DD (check-in). Must be today or later.'),
  end_date: isoDate.describe('Check-out date, YYYY-MM-DD. Exclusive: the night of this date is NOT changed.'),
}

export const blockDatesInputSchema = z.object({
  ...writeStay,
  reason: z.string().trim().min(1).max(200).describe('Short reason in the user\'s words, e.g. "שיפוץ". Kept in the audit log.'),
})

export const updatePriceInputSchema = z.object({
  ...writeStay,
  new_price: z
    .number()
    .positive()
    .max(MAX_NIGHTLY_PRICE)
    .describe('New BASE nightly price in ILS. Do not add channel markups; Airbnb/Booking uplifts are applied automatically.'),
})

export type BlockDatesInput = z.infer<typeof blockDatesInputSchema>
export type UpdatePriceInput = z.infer<typeof updatePriceInputSchema>
