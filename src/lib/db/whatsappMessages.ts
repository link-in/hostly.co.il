/**
 * DB repository — whatsapp_messages_log
 * Central log of every outbound WhatsApp attempt (success or failure).
 */

import { createServerClient } from '@/lib/supabase/server'

export type WhatsAppMessageType =
  | 'new_booking_guest'
  | 'new_booking_owner'
  | 'cancellation_owner'
  | 'booking_request_owner'
  | 'inquiry_owner'
  | 'check_in_guest'
  | 'check_in_owner'
  | 'review_reminder_guest'
  | 'review_reminder_test'
  | 'public_booking_owner'
  | 'manual_booking_guest'
  | 'other'

export type WhatsAppRecipientRole = 'guest' | 'owner' | 'other'
export type WhatsAppLogStatus = 'sent' | 'failed' | 'skipped'

export interface WhatsAppMessageLogInsert {
  userId?: string | null
  bookingId?: string | number | null
  messageType: WhatsAppMessageType
  recipientRole: WhatsAppRecipientRole
  recipientPhone: string
  recipientName?: string | null
  messageBody?: string | null
  status: WhatsAppLogStatus
  provider?: string | null
  providerMessageId?: string | null
  error?: string | null
}

export interface WhatsAppMessageLogRow {
  id: string
  user_id: string | null
  booking_id: string | null
  message_type: string
  recipient_role: string
  recipient_phone: string
  recipient_name: string | null
  message_body: string | null
  status: string
  provider: string | null
  provider_message_id: string | null
  error: string | null
  created_at: string
}

/** Inserts a log row. Never throws — logging must not break send paths. */
export async function insertWhatsAppMessageLog(data: WhatsAppMessageLogInsert): Promise<void> {
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from('whatsapp_messages_log').insert({
      user_id: data.userId ?? null,
      booking_id: data.bookingId != null ? String(data.bookingId) : null,
      message_type: data.messageType,
      recipient_role: data.recipientRole,
      recipient_phone: data.recipientPhone,
      recipient_name: data.recipientName ?? null,
      message_body: data.messageBody ?? null,
      status: data.status,
      provider: data.provider ?? null,
      provider_message_id: data.providerMessageId ?? null,
      error: data.error ?? null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('❌ Failed to insert whatsapp_messages_log:', error.message)
    }
  } catch (err) {
    console.error('❌ Unexpected error inserting whatsapp_messages_log:', err)
  }
}

export interface ListWhatsAppMessagesOpts {
  userId: string
  status?: WhatsAppLogStatus | 'all'
  messageType?: string | 'all'
  limit?: number
  offset?: number
}

/** Lists WhatsApp log rows for a host (newest first). */
export async function listWhatsAppMessagesForUser(
  opts: ListWhatsAppMessagesOpts,
): Promise<{ rows: WhatsAppMessageLogRow[]; total: number }> {
  const supabase = createServerClient()
  const limit = Math.min(opts.limit ?? 100, 500)
  const offset = opts.offset ?? 0

  let query = supabase
    .from('whatsapp_messages_log')
    .select('*', { count: 'exact' })
    .eq('user_id', opts.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status && opts.status !== 'all') {
    query = query.eq('status', opts.status)
  }
  if (opts.messageType && opts.messageType !== 'all') {
    query = query.eq('message_type', opts.messageType)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('❌ Failed to list whatsapp_messages_log:', error.message)
    throw new Error(error.message)
  }

  return {
    rows: (data ?? []) as WhatsAppMessageLogRow[],
    total: count ?? 0,
  }
}
