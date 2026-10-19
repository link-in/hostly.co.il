import { describe, it, expect } from 'vitest'
import { parseRoomIds, roomFieldIncludes } from './roomIds'

describe('parseRoomIds', () => {
  it('parses a single id', () => {
    expect(parseRoomIds('638851')).toEqual(['638851'])
  })

  it('parses id:name pairs (wizard format), including Hebrew names', () => {
    expect(parseRoomIds('744952:Bay leaves in Kibbutz Dafna')).toEqual(['744952'])
    expect(parseRoomIds('744267:בית פרטי ושקט')).toEqual(['744267'])
  })

  it('parses comma-separated lists with names', () => {
    expect(parseRoomIds('679503:Room A, 679529:Room B')).toEqual(['679503', '679529'])
  })

  it('handles empty values', () => {
    expect(parseRoomIds('')).toEqual([])
    expect(parseRoomIds(null)).toEqual([])
    expect(parseRoomIds(undefined)).toEqual([])
  })
})

describe('roomFieldIncludes', () => {
  it('matches a webhook room id (number) against an id:name field', () => {
    expect(roomFieldIncludes('744952:Bay leaves in Kibbutz Dafna', 744952)).toBe(true)
  })

  it('does not match a different room or a partial id', () => {
    expect(roomFieldIncludes('744952:Bay leaves', 744953)).toBe(false)
    expect(roomFieldIncludes('7449520', 744952)).toBe(false)
  })
})
