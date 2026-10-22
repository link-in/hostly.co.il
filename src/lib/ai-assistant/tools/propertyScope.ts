/**
 * Ownership guard. Every property/room ID proposed by the model passes through
 * here before any Beds24 call; anything not on the user's own row is refused.
 */
import type { AssistantContext, AssistantProperty, AssistantRoom } from '../context'
import type { RoomTarget } from '../beds24/types'

export interface RoomSelection {
  propertyId?: number
  roomId?: number
}

export interface ResolvedRoom {
  target: RoomTarget
  room: AssistantRoom
}

export type ScopeErrorCode = 'property_not_owned' | 'property_required' | 'room_not_owned' | 'room_required'

export interface ScopeError {
  code: ScopeErrorCode
  message: string
  options?: { propertyId: number; roomId?: number; name?: string }[]
}

export type ScopeResult<T> = { ok: true; value: T } | { ok: false; error: ScopeError }

function resolveProperty(context: AssistantContext, propertyId: number | undefined): ScopeResult<AssistantProperty> {
  if (propertyId === undefined) {
    if (context.properties.length === 1) return { ok: true, value: context.properties[0] }
    return {
      ok: false,
      error: {
        code: 'property_required',
        message: 'This user has several properties; ask which one.',
        options: context.properties.map((p) => ({ propertyId: p.propertyId })),
      },
    }
  }
  const property = context.properties.find((p) => p.propertyId === propertyId)
  if (property) return { ok: true, value: property }
  return {
    ok: false,
    error: { code: 'property_not_owned', message: `Property ${propertyId} does not belong to this user.` },
  }
}

function toResolved(context: AssistantContext, property: AssistantProperty, room: AssistantRoom): ResolvedRoom {
  return { target: { userId: context.userId, propertyId: property.propertyId, roomId: room.roomId }, room }
}

function roomOptions(property: AssistantProperty): ScopeError['options'] {
  return property.rooms.map((r) => ({ propertyId: property.propertyId, roomId: r.roomId, name: r.name }))
}

/** For reads: a specific room, or every room of the property when no room is given. */
export function resolveRooms(context: AssistantContext, selection: RoomSelection): ScopeResult<ResolvedRoom[]> {
  const property = resolveProperty(context, selection.propertyId)
  if (!property.ok) return property

  if (selection.roomId === undefined) {
    return { ok: true, value: property.value.rooms.map((room) => toResolved(context, property.value, room)) }
  }

  const room = property.value.rooms.find((r) => r.roomId === selection.roomId)
  if (room) return { ok: true, value: [toResolved(context, property.value, room)] }
  return {
    ok: false,
    error: {
      code: 'room_not_owned',
      message: `Room ${selection.roomId} is not one of this property's rooms.`,
      options: roomOptions(property.value),
    },
  }
}

/** For writes: exactly one room. Never guesses when the property has more than one. */
export function resolveSingleRoom(context: AssistantContext, selection: RoomSelection): ScopeResult<ResolvedRoom> {
  const rooms = resolveRooms(context, selection)
  if (!rooms.ok) return rooms
  if (rooms.value.length === 1) return { ok: true, value: rooms.value[0] }

  const property = resolveProperty(context, selection.propertyId)
  return {
    ok: false,
    error: {
      code: 'room_required',
      message: 'This property has several rooms; ask which one (or whether to apply to each separately).',
      options: property.ok ? roomOptions(property.value) : undefined,
    },
  }
}
