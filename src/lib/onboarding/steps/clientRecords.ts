import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateApiKey, refreshRoomCache } from '@/lib/availability/cache'
import { CALENDAR_API_KEY_NAME } from '../constants'
import { OnboardingError } from '../errors'
import { resolveBeds24Tokens } from '../tokens'

/** `room_id` uses the app-wide `<id>:<name>` convention so dashboard tabs show the name. */
export function formatRoomIdValue(roomId: string, roomName?: string): string {
  return roomName ? `${roomId}:${roomName}` : roomId
}

export async function saveUserPropertyRoom(
  userId: string,
  propertyId: string,
  roomId: string,
  roomName?: string,
): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('users')
    .update({ property_id: propertyId, room_id: formatRoomIdValue(roomId, roomName) })
    .eq('id', userId)
  if (error) throw new OnboardingError(`שגיאה בשמירת מזהי הנכס: ${error.message}`, 500)
}

/** Empty tokens make `fetchWithTokenRefresh` use the master account tokens. */
export async function seedClientCache(
  userId: string,
  propertyId: string,
  roomId: string,
): Promise<{ upserted: number; warning: string | null }> {
  const tokens = await resolveBeds24Tokens(userId)
  const result = await refreshRoomCache(
    userId,
    propertyId,
    roomId,
    tokens?.accessToken ?? '',
    tokens?.refreshToken ?? '',
  )
  return { upserted: result.upserted, warning: result.error ?? null }
}

export async function createCalendarApiKey(userId: string, roomId: string): Promise<string> {
  const key = generateApiKey()
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('api_keys').insert({
    user_id: userId,
    name: CALENDAR_API_KEY_NAME,
    key,
    allowed_room_ids: [roomId],
    is_active: true,
  })
  if (error) throw new OnboardingError(`שגיאה ביצירת מפתח API: ${error.message}`, 500)
  return key
}
