import { z } from 'zod'

/** One language entry of Beds24 `texts` (property or room). Every field is optional text. */
const textEntrySchema = z.record(z.string(), z.unknown())
export type Beds24TextEntry = z.infer<typeof textEntrySchema>

const idSchema = z.union([z.number(), z.string()]).transform(String)
const featureCodesSchema = z.array(z.array(z.string())).default([])
const optionalNumber = z.number().nullable().optional()

export const beds24RoomSchema = z.looseObject({
  id: idSchema,
  name: z.string().optional(),
  maxPeople: optionalNumber,
  rackRate: optionalNumber,
  minPrice: optionalNumber,
  featureCodes: featureCodesSchema,
  texts: z.array(textEntrySchema).default([]),
})
export type Beds24Room = z.infer<typeof beds24RoomSchema>

export const beds24PropertySchema = z.looseObject({
  id: idSchema,
  name: z.string().optional(),
  city: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  featureCodes: featureCodesSchema,
  texts: z.array(textEntrySchema).default([]),
  roomTypes: z.array(beds24RoomSchema).default([]),
})
export type Beds24Property = z.infer<typeof beds24PropertySchema>

export const beds24PropertiesResponseSchema = z.looseObject({
  data: z.array(beds24PropertySchema).default([]),
})

/**
 * Beds24 V2 `GET /properties` query for landing content. `includePictures` is
 * requested but, as of Oct 2026, the response carries no picture field.
 */
export const PROPERTY_CONTENT_QUERY = {
  includeAllRooms: 'true',
  includeTexts: 'all',
  includeLanguages: 'all',
  includePictures: 'true',
} as const
