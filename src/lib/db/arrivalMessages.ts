/**
 * DB repository — arrival_message_settings + arrival_messages_log
 *
 * Settings:  per-host configuration for the morning-of-arrival WhatsApp.
 * Log table: dedup key is booking_id UNIQUE.
 *   - To skip a booking:   insertArrivalMessageLog with status='skipped_manual'
 *   - To un-skip:          unmarkBookingSkipped(bookingId)
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────────────────

export type ArrivalMessageStatus =
  | 'sent'
  | 'failed'
  | 'skipped_no_phone'
  | 'skipped_manual'

export interface ArrivalMessageSettings {
  userId: string
  enabled: boolean
  photoUrl: string | null
  photoStoragePath: string | null
  introText: string | null
  wazeLink: string | null
  houseRules: string | null
  updatedAt: string
}

export interface ArrivalMessageLogInsert {
  bookingId: number | string
  userId: string
  guestName: string
  guestPhone: string | null
  checkInDate: string | null
  status: ArrivalMessageStatus
  whatsappError?: string | null
}

// ── Settings CRUD ─────────────────────────────────────────────────────────

/** Returns the arrival message settings for this user, or null if not yet configured. */
export async function getArrivalMessageSettings(
  userId: string,
): Promise<ArrivalMessageSettings | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('arrival_message_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[ArrivalMessages] getArrivalMessageSettings error:', error.message)
    return null
  }
  if (!data) return null

  return {
    userId: data.user_id,
    enabled: data.enabled ?? false,
    photoUrl: data.photo_url ?? null,
    photoStoragePath: data.photo_storage_path ?? null,
    introText: data.intro_text ?? null,
    wazeLink: data.waze_link ?? null,
    houseRules: data.house_rules ?? null,
    updatedAt: data.updated_at,
  }
}

/** Upsert arrival message settings for a user. Returns the saved settings. */
export async function upsertArrivalMessageSettings(
  userId: string,
  updates: Partial<Omit<ArrivalMessageSettings, 'userId' | 'updatedAt'>>,
): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('arrival_message_settings').upsert(
    {
      user_id: userId,
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
      ...(updates.photoUrl !== undefined && { photo_url: updates.photoUrl }),
      ...(updates.photoStoragePath !== undefined && { photo_storage_path: updates.photoStoragePath }),
      ...(updates.introText !== undefined && { intro_text: updates.introText }),
      ...(updates.wazeLink !== undefined && { waze_link: updates.wazeLink }),
      ...(updates.houseRules !== undefined && { house_rules: updates.houseRules }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    console.error('[ArrivalMessages] upsertArrivalMessageSettings error:', error.message)
    return { error: error.message }
  }
  return { error: null }
}

// ── Log / dedup ────────────────────────────────────────────────────────────

/**
 * Returns true if a log row already exists for this bookingId —
 * whether it was sent, failed, or skipped.
 */
export async function isArrivalMessageAlreadyProcessed(
  bookingId: number | string,
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('arrival_messages_log')
    .select('id')
    .eq('booking_id', String(bookingId))
    .maybeSingle()
  return !!data
}

/** Inserts a new log row. Used by the cron and by the manual-skip action. */
export async function insertArrivalMessageLog(
  entry: ArrivalMessageLogInsert,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('arrival_messages_log')
    .insert({
      booking_id: String(entry.bookingId),
      user_id: entry.userId,
      guest_name: entry.guestName,
      guest_phone: entry.guestPhone,
      check_in_date: entry.checkInDate,
      status: entry.status,
      whatsapp_error: entry.whatsappError ?? null,
      created_at: new Date().toISOString(),
    })
    .select('id')

  if (error) {
    console.error('[ArrivalMessages] insertArrivalMessageLog error:', error.message)
    return { id: null, error: error.message }
  }
  const id = Array.isArray(data) ? (data[0]?.id ?? null) : null
  return { id, error: null }
}

/**
 * Pre-inserts a skipped_manual row so the cron ignores this booking.
 * Idempotent — if a row already exists this is a no-op.
 */
export async function markBookingSkipped(
  userId: string,
  bookingId: number | string,
  checkInDate: string | null,
  guestName?: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('arrival_messages_log').upsert(
    {
      booking_id: String(bookingId),
      user_id: userId,
      guest_name: guestName ?? null,
      guest_phone: null,
      check_in_date: checkInDate,
      status: 'skipped_manual',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'booking_id', ignoreDuplicates: true },
  )

  if (error) {
    console.error('[ArrivalMessages] markBookingSkipped error:', error.message)
    return { error: error.message }
  }
  return { error: null }
}

/**
 * Removes the skipped_manual row for a booking, allowing the cron to send next time.
 * Only deletes rows with status='skipped_manual' — will not undo a sent/failed row.
 */
export async function unmarkBookingSkipped(
  bookingId: number | string,
): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('arrival_messages_log')
    .delete()
    .eq('booking_id', String(bookingId))
    .eq('status', 'skipped_manual')

  if (error) {
    console.error('[ArrivalMessages] unmarkBookingSkipped error:', error.message)
    return { error: error.message }
  }
  return { error: null }
}

/** Looks up an arrival_messages_log row for a booking (for UI state display). */
export async function getArrivalMessageLogEntry(
  bookingId: number | string,
): Promise<{ status: ArrivalMessageStatus | null; error: string | null }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('arrival_messages_log')
    .select('status')
    .eq('booking_id', String(bookingId))
    .maybeSingle()

  if (error) return { status: null, error: error.message }
  return { status: (data?.status as ArrivalMessageStatus) ?? null, error: null }
}
