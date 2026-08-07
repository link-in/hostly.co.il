/**
 * Groups WhatsApp log rows that represent the same outbound message
 * sent to multiple recipients (e.g. primary + secondary owner phone).
 */

import type { WhatsAppMessageLogRow } from '@/lib/db/whatsappMessages'

export interface WhatsAppMessageLogGroup {
  id: string
  created_at: string
  message_type: string
  recipient_role: string
  recipient_name: string | null
  message_body: string | null
  booking_id: string | null
  provider: string | null
  /** Aggregated delivery status across recipients. */
  status: 'sent' | 'failed' | 'partial'
  recipients: Array<{
    id: string
    phone: string
    status: string
    error: string | null
    provider_message_id: string | null
  }>
}

function groupKey(row: WhatsAppMessageLogRow): string {
  const body = row.message_body ?? ''
  if (row.booking_id) {
    return `${row.booking_id}|${row.message_type}|${body}`
  }
  // No booking id — still merge identical fan-outs within the same minute
  const minute = row.created_at.slice(0, 16)
  return `${minute}|${row.message_type}|${body}`
}

function aggregateStatus(statuses: string[]): WhatsAppMessageLogGroup['status'] {
  const sent = statuses.filter((s) => s === 'sent').length
  const failed = statuses.filter((s) => s === 'failed').length
  if (sent > 0 && failed > 0) return 'partial'
  if (failed > 0 && sent === 0) return 'failed'
  return 'sent'
}

/** Collapses multi-recipient sends of the same message into one display row. */
export function groupWhatsAppMessageLogs(
  rows: WhatsAppMessageLogRow[],
): WhatsAppMessageLogGroup[] {
  const map = new Map<string, WhatsAppMessageLogRow[]>()

  for (const row of rows) {
    const key = groupKey(row)
    const bucket = map.get(key)
    if (bucket) bucket.push(row)
    else map.set(key, [row])
  }

  const groups: WhatsAppMessageLogGroup[] = []

  for (const [, bucket] of map) {
    const sorted = [...bucket].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const newest = sorted[0]
    groups.push({
      id: newest.id,
      created_at: newest.created_at,
      message_type: newest.message_type,
      recipient_role: newest.recipient_role,
      recipient_name: newest.recipient_name,
      message_body: newest.message_body,
      booking_id: newest.booking_id,
      provider: newest.provider,
      status: aggregateStatus(sorted.map((r) => r.status)),
      recipients: sorted.map((r) => ({
        id: r.id,
        phone: r.recipient_phone,
        status: r.status,
        error: r.error,
        provider_message_id: r.provider_message_id,
      })),
    })
  }

  return groups.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}
