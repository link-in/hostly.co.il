import { describe, it, expect } from 'vitest'
import type { AssistantContext } from '../context'
import { resolveRooms, resolveSingleRoom } from './propertyScope'

const singleRoom: AssistantContext = {
  userId: 'user-1',
  displayName: 'דלית',
  channel: 'web',
  properties: [{ propertyId: 306559, rooms: [{ roomId: 638851, name: 'נוף הרים' }] }],
}

const multiRoom: AssistantContext = {
  ...singleRoom,
  properties: [
    {
      propertyId: 306559,
      rooms: [
        { roomId: 638851, name: 'נוף הרים' },
        { roomId: 672381, name: 'חדר שני' },
      ],
    },
  ],
}

const multiProperty: AssistantContext = {
  ...singleRoom,
  properties: [...singleRoom.properties, { propertyId: 400000, rooms: [{ roomId: 1, name: 'א' }] }],
}

describe('resolveRooms', () => {
  it('defaults to the only property and all its rooms', () => {
    const result = resolveRooms(multiRoom, {})
    expect(result.ok && result.value.map((r) => r.target)).toEqual([
      { userId: 'user-1', propertyId: 306559, roomId: 638851 },
      { userId: 'user-1', propertyId: 306559, roomId: 672381 },
    ])
  })

  it('narrows to the requested room', () => {
    const result = resolveRooms(multiRoom, { propertyId: 306559, roomId: 672381 })
    expect(result.ok && result.value.map((r) => r.room.name)).toEqual(['חדר שני'])
  })

  it("refuses another user's property", () => {
    const result = resolveRooms(singleRoom, { propertyId: 111111 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('property_not_owned')
  })

  it('refuses a room outside the property and lists the valid ones', () => {
    const result = resolveRooms(multiRoom, { roomId: 999 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('room_not_owned')
      expect(result.error.options?.map((o) => o.roomId)).toEqual([638851, 672381])
    }
  })

  it('asks which property when there are several', () => {
    const result = resolveRooms(multiProperty, {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('property_required')
  })
})

describe('resolveSingleRoom', () => {
  it('picks the only room without asking', () => {
    const result = resolveSingleRoom(singleRoom, {})
    expect(result.ok && result.value.target).toEqual({ userId: 'user-1', propertyId: 306559, roomId: 638851 })
  })

  it('never guesses when the property has several rooms', () => {
    const result = resolveSingleRoom(multiRoom, {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('room_required')
      expect(result.error.options).toHaveLength(2)
    }
  })

  it('uses the userId from the context, not from the selection', () => {
    const result = resolveSingleRoom(multiRoom, { roomId: 672381 })
    expect(result.ok && result.value.target.userId).toBe('user-1')
  })
})
