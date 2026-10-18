import { z } from 'zod'

// ─── Beds24 responses ────────────────────────────────────────────────────────

const numericId = z.union([z.number(), z.string()]).transform(String)

export const multiplePostResponseSchema = z.array(
  z.looseObject({
    success: z.boolean().optional(),
    new: z.unknown().optional(),
    modified: z.unknown().optional(),
  }),
)
export type MultiplePostResponse = z.infer<typeof multiplePostResponseSchema>

const airbnbUserFields = z.looseObject({
  airbnbUserId: numericId.optional(),
  userId: numericId.optional(),
  id: numericId.optional(),
  firstName: z.string().optional(),
  picture: z.string().optional(),
})

export const airbnbUsersResponseSchema = z.looseObject({
  data: z.array(airbnbUserFields.extend({ airbnbUser: airbnbUserFields.optional() })).default([]),
})

export const airbnbListingsResponseSchema = z.looseObject({
  data: z.array(z.looseObject({})).default([]),
})

export const channelSettingsResponseSchema = z.looseObject({
  data: z.array(
    z.looseObject({
      channel: z.string().optional(),
      properties: z.array(
        z.looseObject({
          id: numericId,
          multiplier: z.coerce.number().optional(),
          roomTypes: z.array(
            z.looseObject({
              id: numericId,
              enabled: z.boolean().optional(),
              airbnbListingId: numericId.optional().nullable(),
            }),
          ).default([]),
        }),
      ).default([]),
    }),
  ).default([]),
})
export type ChannelSettingsResponse = z.infer<typeof channelSettingsResponseSchema>

export const accountsResponseSchema = z.looseObject({
  data: z.array(
    z.looseObject({
      id: numericId.optional(),
      usage: z.looseObject({
        numProperties: z.number().optional(),
        numLinks: z.number().optional(),
        channelLinks: z.record(z.string(), z.number()).optional(),
      }).optional(),
    }),
  ).default([]),
})

// ─── Wizard step inputs ──────────────────────────────────────────────────────

const beds24Id = z.string().trim().regex(/^\d+$/, 'מזהה Beds24 חייב להיות מספרי')

export const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'cabin', 'guesthouse', 'studio'] as const

export const propertyStepInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('create'),
    name: z.string().trim().min(2, 'שם הנכס קצר מדי').max(100),
    propertyType: z.enum(PROPERTY_TYPES).default('apartment'),
    maxPeople: z.number().int().min(1).max(30).default(2),
    currency: z.string().trim().length(3).default('ILS'),
  }),
  z.object({
    mode: z.literal('importAirbnb'),
    airbnbUserId: beds24Id,
    airbnbListingId: beds24Id,
    listingName: z.string().trim().max(200).optional(),
  }),
])
export type PropertyStepInput = z.infer<typeof propertyStepInputSchema>

export const basePriceStepInputSchema = z.object({
  price: z.number().positive('המחיר חייב להיות חיובי').max(100_000),
  minStay: z.number().int().min(1).max(60).default(1),
  months: z.number().int().min(1).max(24).default(12),
})
export type BasePriceStepInput = z.infer<typeof basePriceStepInputSchema>

export const airbnbConnectStepInputSchema = z.object({
  airbnbUserId: beds24Id,
  airbnbListingId: beds24Id,
  listingName: z.string().trim().max(200).optional(),
})
export type AirbnbConnectStepInput = z.infer<typeof airbnbConnectStepInputSchema>

export const bookingComStepInputSchema = z.object({
  hotelId: z.string().trim().regex(/^\d*$/, 'מזהה המלון חייב להיות מספרי').optional(),
})
export type BookingComStepInput = z.infer<typeof bookingComStepInputSchema>

export const airbnbListingsQuerySchema = z.object({ airbnbUserId: beds24Id })
