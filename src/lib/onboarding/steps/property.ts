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
      roomTypes: z.array(z.looseObject({ id: z.union([z.number(), z.string()]) })).default([]),
    }),
  ).default([]),
})

export function buildPropertyPayload(input: NewPropertyInput) {
  return [{
    name: input.name,
    propertyType: input.propertyType,
    currency: input.currency,
    roomTypes: [{ name: input.name, qty: 1, maxPeople: input.maxPeople }],
  }]
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
