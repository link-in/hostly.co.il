import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import { buildAssistantContext, loadAssistantContext, parseRooms, type AssistantUserRow } from './context'

let fakeClient: FakeSupabaseClient
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => fakeClient }))

const baseRow: AssistantUserRow = {
  id: 'user-1',
  display_name: 'דלית',
  property_id: '306559',
  room_id: '638851:נוף הרים,672381:חדר שני',
  is_demo: false,
  beds24_api_suspended_at: null,
}

describe('parseRooms', () => {
  it('parses a single ID and names it by position', () => {
    expect(parseRooms('638851')).toEqual([{ roomId: 638851, name: 'חדר 1' }])
  })

  it('parses id:name pairs, keeping colons inside names', () => {
    expect(parseRooms('1:Bay leaves, 2:חדר: גדול')).toEqual([
      { roomId: 1, name: 'Bay leaves' },
      { roomId: 2, name: 'חדר: גדול' },
    ])
  })

  it('drops malformed and duplicate IDs', () => {
    expect(parseRooms('abc,0,-3,12x,5,5:dup, ,7')).toEqual([
      { roomId: 5, name: 'חדר 1' },
      { roomId: 7, name: 'חדר 2' },
    ])
  })

  it('returns no rooms for an empty field', () => {
    expect(parseRooms(null)).toEqual([])
    expect(parseRooms('')).toEqual([])
  })
})

describe('buildAssistantContext', () => {
  it('builds the context from the user row', () => {
    expect(buildAssistantContext(baseRow, 'web')).toEqual({
      ok: true,
      context: {
        userId: 'user-1',
        displayName: 'דלית',
        channel: 'web',
        properties: [
          {
            propertyId: 306559,
            rooms: [
              { roomId: 638851, name: 'נוף הרים' },
              { roomId: 672381, name: 'חדר שני' },
            ],
          },
        ],
      },
    })
  })

  it.each([
    ['user_not_found', null],
    ['demo_account', { ...baseRow, is_demo: true }],
    ['beds24_suspended', { ...baseRow, beds24_api_suspended_at: '2026-10-01T00:00:00Z' }],
    ['no_property', { ...baseRow, property_id: '' }],
    ['no_property', { ...baseRow, property_id: '306559,1' }],
    ['no_rooms', { ...baseRow, room_id: null }],
  ] as const)('refuses with %s', (code, row) => {
    expect(buildAssistantContext(row, 'web')).toEqual({ ok: false, code })
  })
})

describe('loadAssistantContext', () => {
  beforeEach(() => {
    fakeClient = createFakeSupabaseClient({
      users: [{ ...baseRow, beds24_token: 'secret' }, { ...baseRow, id: 'user-2', property_id: '999' }],
    })
  })

  it('loads the requested user only', async () => {
    const result = await loadAssistantContext('user-1', 'whatsapp')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.context.channel).toBe('whatsapp')
      expect(result.context.properties[0].propertyId).toBe(306559)
    }
  })

  it('never exposes Beds24 tokens in the context', async () => {
    const result = await loadAssistantContext('user-1', 'web')
    expect(JSON.stringify(result)).not.toContain('secret')
  })

  it('reports an unknown user', async () => {
    expect(await loadAssistantContext('nobody', 'web')).toEqual({ ok: false, code: 'user_not_found' })
  })
})
