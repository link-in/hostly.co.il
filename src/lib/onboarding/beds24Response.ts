import { Beds24RequestError } from './errors'

export interface Beds24PropertyRoomIds {
  propertyId: string
  roomId: string
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function toId(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function firstRecord(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return asRecord(value[0])
  return asRecord(value)
}

function idFromObject(value: unknown): string | undefined {
  return toId(asRecord(value)?.id)
}

function idsFromNewObject(item: Record<string, unknown>): Partial<Beds24PropertyRoomIds> {
  const created = asRecord(item.new) ?? asRecord(item.modified)
  if (!created) return {}
  const property = firstRecord(created.property ?? created.properties)
  const room = firstRecord(
    created.room
      ?? created.rooms
      ?? created.roomType
      ?? created.roomTypes
      ?? property?.room
      ?? property?.rooms
      ?? property?.roomType
      ?? property?.roomTypes,
  )
  return {
    propertyId: toId(created.propertyId) ?? idFromObject(property) ?? toId(created.id),
    roomId: toId(created.roomId ?? created.roomTypeId) ?? idFromObject(room),
  }
}

function idsFromFlatObject(item: Record<string, unknown>): Partial<Beds24PropertyRoomIds> {
  const nested = asRecord(item.data) ?? {}
  return {
    propertyId: toId(item.propertyId ?? item.propId ?? nested.propertyId ?? nested.propId),
    roomId: toId(item.roomId ?? item.roomTypeId ?? nested.roomId ?? nested.roomTypeId),
  }
}

/**
 * Extracts whatever property / first-room IDs a Beds24 create or import response contains.
 * Supports `{ new: { id, roomTypes: [{ id }] } }` and `{ propertyId, roomId }` shapes.
 */
export function extractCreatedIds(body: unknown): Partial<Beds24PropertyRoomIds> {
  const first = asRecord(Array.isArray(body) ? body[0] : body)
  if (!first) return {}

  const fromNew = idsFromNewObject(first)
  const fromFlat = idsFromFlatObject(first)
  return {
    propertyId: fromNew.propertyId ?? fromFlat.propertyId,
    roomId: fromNew.roomId ?? fromFlat.roomId,
  }
}

export function parseCreatedPropertyRoomIds(body: unknown): Beds24PropertyRoomIds {
  const { propertyId, roomId } = extractCreatedIds(body)
  if (!propertyId || !roomId) {
    throw new Beds24RequestError('Beds24 לא החזירה מזהי נכס וחדר', body)
  }
  return { propertyId, roomId }
}
