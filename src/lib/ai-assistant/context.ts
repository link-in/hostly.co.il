/**
 * The assistant's view of "who is asking and what may they touch".
 *
 * Built from the `users` row, never from model output or the (possibly stale)
 * session JWT. Users without their own Beds24 tokens run on the master account,
 * which can see every client's properties — so the property/room IDs here are
 * the only thing standing between a prompt and someone else's calendar.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

export type AssistantChannel = 'web' | 'whatsapp'

export interface AssistantRoom {
  roomId: number
  name: string
}

export interface AssistantProperty {
  propertyId: number
  rooms: AssistantRoom[]
}

export interface AssistantContext {
  userId: string
  displayName: string
  channel: AssistantChannel
  properties: AssistantProperty[]
}

export interface AssistantUserRow {
  id: string
  display_name: string | null
  property_id: string | null
  room_id: string | null
  is_demo: boolean | null
  beds24_api_suspended_at: string | null
}

export type ContextErrorCode = 'user_not_found' | 'demo_account' | 'beds24_suspended' | 'no_property' | 'no_rooms'

export type ContextResult = { ok: true; context: AssistantContext } | { ok: false; code: ContextErrorCode }

function toPositiveInt(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  return parsed > 0 ? parsed : null
}

/** Parses `users.room_id` ("1", "1,2" or "1:name,2:name") into rooms, dropping malformed IDs. */
export function parseRooms(roomField: string | null): AssistantRoom[] {
  const seen = new Set<number>()
  const rooms: AssistantRoom[] = []
  for (const part of (roomField ?? '').split(',')) {
    const [rawId, ...nameParts] = part.split(':')
    const roomId = toPositiveInt(rawId ?? '')
    if (roomId === null || seen.has(roomId)) continue
    seen.add(roomId)
    rooms.push({ roomId, name: nameParts.join(':').trim() || `חדר ${rooms.length + 1}` })
  }
  return rooms
}

export function buildAssistantContext(row: AssistantUserRow | null, channel: AssistantChannel): ContextResult {
  if (!row) return { ok: false, code: 'user_not_found' }
  if (row.is_demo) return { ok: false, code: 'demo_account' }
  if (row.beds24_api_suspended_at) return { ok: false, code: 'beds24_suspended' }

  const propertyId = toPositiveInt(row.property_id ?? '')
  if (propertyId === null) return { ok: false, code: 'no_property' }

  const rooms = parseRooms(row.room_id)
  if (!rooms.length) return { ok: false, code: 'no_rooms' }

  return {
    ok: true,
    context: {
      userId: row.id,
      displayName: row.display_name?.trim() || '',
      channel,
      properties: [{ propertyId, rooms }],
    },
  }
}

export async function loadAssistantContext(userId: string, channel: AssistantChannel): Promise<ContextResult> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, property_id, room_id, is_demo, beds24_api_suspended_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load assistant context: ${error.message}`)
  return buildAssistantContext((data as AssistantUserRow | null) ?? null, channel)
}
