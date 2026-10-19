import { z } from 'zod'
import { beds24Request, type OnboardingCallContext } from '../beds24Client'
import { extractCreatedIds, type Beds24PropertyRoomIds } from '../beds24Response'
import { multiplePostResponseSchema } from '../schemas'
import { Beds24RequestError } from '../errors'

export interface NewPropertyInput {
  name: string
  propertyType: string
  maxPeople: number
  currency: string
}

const propertiesResponseSchema = z.looseObject({
  data: z.array(
    z.looseObject({
      id: z.union([z.number(), z.string()]),
      name: z.string().optional(),
      roomTypes: z.array(z.looseObject({
        id: z.union([z.number(), z.string()]),
        name: z.string().optional(),
      })).default([]),
    }),
  ).default([]),
})
type PropertiesResponse = z.infer<typeof propertiesResponseSchema>

export interface PropertySummary {
  propertyId: string
  name: string
  rooms: { roomId: string; name: string }[]
}

export function toPropertySummaries(res: PropertiesResponse): PropertySummary[] {
  return res.data.map((property) => ({
    propertyId: String(property.id),
    name: property.name?.trim() || `נכס ${property.id}`,
    rooms: property.roomTypes.map((room) => ({
      roomId: String(room.id),
      name: room.name?.trim() || `חדר ${room.id}`,
    })),
  }))
}

/** Lists every property in the account with its rooms and names. */
export async function listProperties(ctx: OnboardingCallContext): Promise<PropertySummary[]> {
  const res = await beds24Request(ctx, {
    method: 'GET',
    path: '/properties',
    query: { includeAllRooms: true },
    schema: propertiesResponseSchema,
  })
  return toPropertySummaries(res)
}

export interface ExistingPropertyRoom extends Beds24PropertyRoomIds {
  roomName: string
}

/** Confirms the property and room exist in the account the client's tokens resolve to. */
export async function getExistingPropertyRoom(
  ctx: OnboardingCallContext,
  propertyId: string,
  roomId: string,
): Promise<ExistingPropertyRoom> {
  const res = await beds24Request(ctx, {
    method: 'GET',
    path: '/properties',
    query: { id: propertyId, includeAllRooms: true },
    schema: propertiesResponseSchema,
  })
  const property = toPropertySummaries(res).find((p) => p.propertyId === propertyId)
  const room = property?.rooms.find((r) => r.roomId === roomId)
  if (!property || !room) {
    throw new Beds24RequestError(`הנכס ${propertyId} או החדר ${roomId} לא נמצאו בחשבון ה-Beds24 של הלקוח`, res)
  }
  return { propertyId, roomId, roomName: room.name }
}

export function buildPropertyPayload(input: NewPropertyInput) {
  return [{
    name: input.name,
    propertyType: input.propertyType,
    currency: input.currency,
    roomTypes: [{ name: input.name, qty: 1, maxPeople: input.maxPeople }],
  }]
}

export interface PropertyRooms {
  propertyId: string
  roomIds: string[]
}

/** Lists every property in the account with its room IDs. */
export async function listPropertyRooms(ctx: OnboardingCallContext): Promise<PropertyRooms[]> {
  const properties = await listProperties(ctx)
  return properties.map((p) => ({ propertyId: p.propertyId, roomIds: p.rooms.map((r) => r.roomId) }))
}

/** Returns the single property that exists in `after` but not in `before`, if there is exactly one. */
export function findNewProperty(before: PropertyRooms[], after: PropertyRooms[]): Beds24PropertyRoomIds | undefined {
  const known = new Set(before.map((p) => p.propertyId))
  const added = after.filter((p) => !known.has(p.propertyId) && p.roomIds.length > 0)
  if (added.length !== 1) return undefined
  return { propertyId: added[0].propertyId, roomId: added[0].roomIds[0] }
}

async function findFirstRoomId(ctx: OnboardingCallContext, propertyId: string): Promise<string | undefined> {
  const res = await beds24Request(ctx, {
    method: 'GET',
    path: '/properties',
    query: { id: propertyId, includeAllRooms: true },
    schema: propertiesResponseSchema,
  })
  const roomId = res.data[0]?.roomTypes[0]?.id
  return roomId === undefined ? undefined : String(roomId)
}

/** Creates a property with one nested room type in a single Beds24 call. */
export async function createPropertyWithRoom(
  ctx: OnboardingCallContext,
  input: NewPropertyInput,
): Promise<Beds24PropertyRoomIds> {
  const res = await beds24Request(ctx, {
    method: 'POST',
    path: '/properties',
    body: buildPropertyPayload(input),
    schema: multiplePostResponseSchema,
  })

  const { propertyId, roomId } = extractCreatedIds(res)
  if (!propertyId) throw new Beds24RequestError('Beds24 לא החזירה מזהה נכס', res)

  const resolvedRoomId = roomId ?? (await findFirstRoomId(ctx, propertyId))
  if (!resolvedRoomId) {
    throw new Beds24RequestError(`הנכס ${propertyId} נוצר אבל לא נמצא חדר`, res)
  }
  return { propertyId, roomId: resolvedRoomId }
}
