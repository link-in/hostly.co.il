/**
 * DB repository — notifications_log table
 * Centralises all reads/writes to the notifications_log table.
 */

import { createServerClient } from '@/lib/supabase/server'

export interface NotificationInsert {
  bookingId: number | string
  guestName: string
  phone: string
  guestEmail: string | null
  checkInDate: string
  rawPayload: unknown
}

/** Returns true if a notification for this bookingId already exists (deduplication). */
export async function isDuplicateNotification(bookingId: number | string): Promise<boolean> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('notifications_log')
    .select('id')
    .eq('booking_id', String(bookingId))
    .maybeSingle()
  return !!data
}

/** Inserts a new row and returns its ID. */
export async function insertNotification(
  data: NotificationInsert,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createServerClient()
  const { data: result, error } = await supabase
    .from('notifications_log')
    .insert({
      booking_id: String(data.bookingId),
      guest_name: data.guestName,
      phone: data.phone,
      guest_email: data.guestEmail,
      check_in_date: data.checkInDate,
      raw_payload: data.rawPayload,
      status: 'received',
      created_at: new Date().toISOString(),
    })
    .select('id')

  if (error) return { id: null, error: error.message }
  const id = Array.isArray(result) ? (result[0]?.id ?? null) : null
  return { id, error: null }
}

/** Updates the WhatsApp delivery status of an existing notification row. */
export async function updateNotificationStatus(
  id: string,
  opts: { success: boolean; whatsappError?: string | null },
): Promise<void> {
  const supabase = createServerClient()
  await supabase
    .from('notifications_log')
    .update({
      status: opts.success ? 'sent' : 'failed',
      whatsapp_sent_at: opts.success ? new Date().toISOString() : null,
      whatsapp_error: opts.whatsappError ?? null,
    })
    .eq('id', id)
}
