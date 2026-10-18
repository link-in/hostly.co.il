/**
 * סנכרון propertyId / roomId מה-DB אל ה-JWT.
 *
 * ה-JWT מחזיק את הנכס והחדר מרגע ההתחברות. כשאדמין מסיים onboarding (או משנה נכס/חדר)
 * בזמן שהמשתמש כבר מחובר, הסשן נשאר עם נתונים ישנים/ריקים עד התחברות מחדש.
 * כאן מרעננים אותם מה-DB לכל היותר פעם בדקה.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

export const PROPERTY_ROOM_SYNC_INTERVAL_MS = 60_000

export interface PropertyRoom {
  propertyId: string
  roomId: string
}

export function isPropertyRoomSyncDue(
  syncedAt: number | undefined,
  now: number = Date.now(),
  intervalMs: number = PROPERTY_ROOM_SYNC_INTERVAL_MS,
): boolean {
  return syncedAt === undefined || now - syncedAt >= intervalMs
}

/** מחזיר null בכל כשל כדי שהסשן הקיים ימשיך לעבוד. */
export async function loadPropertyRoom(userId: string): Promise<PropertyRoom | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('users')
      .select('property_id, room_id')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    const row = data as { property_id: string | null; room_id: string | null }
    return { propertyId: row.property_id ?? '', roomId: row.room_id ?? '' }
  } catch (err) {
    console.warn('[auth] property/room sync failed (non-fatal):', err)
    return null
  }
}
