/**
 * DB repository — review_reminders_log table
 * Centralises all reads/writes for the post-checkout WhatsApp review-request feature.
 * Uses the service-role client since this runs from an unauthenticated cron job.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { BookingSource } from '@/lib/bookings/normalizer'

export type ReviewReminderStatus = 'sent' | 'failed' | 'skipped_no_phone'

export interface ReviewReminderLogInsert {
  bookingId: number | string
  userId: string
  guestName: string
  guestPhone: string | null
  channel: BookingSource
  checkOutDate: string | null
  status: ReviewReminderStatus
  whatsappError?: string | null
}

/** Returns true if a review reminder for this bookingId was already logged (deduplication). */
export async function isReviewReminderAlreadyProcessed(bookingId: number | string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('review_reminders_log')
    .select('id')
    .eq('booking_id', String(bookingId))
    .maybeSingle()
  return !!data
}

/** Inserts a new review-reminder log row. */
export async function insertReviewReminderLog(
  entry: ReviewReminderLogInsert,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('review_reminders_log')
    .insert({
      booking_id: String(entry.bookingId),
      user_id: entry.userId,
      guest_name: entry.guestName,
      guest_phone: entry.guestPhone,
      channel: entry.channel,
      check_out_date: entry.checkOutDate,
      status: entry.status,
      whatsapp_error: entry.whatsappError ?? null,
      created_at: new Date().toISOString(),
    })
    .select('id')

  if (error) return { id: null, error: error.message }
  const id = Array.isArray(data) ? (data[0]?.id ?? null) : null
  return { id, error: null }
}
