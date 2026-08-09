/**
 * Pure builders + shared send helpers for owner-facing booking WhatsApp alerts
 * (new booking / booking request / inquiry / cancellation).
 * Recipients are always the primary owner phone + optional secondary phone.
 */

import { getOwnerInfoByPropertyRoom } from '@/lib/db/users'
import { isDuplicateNotification, insertNotification } from '@/lib/db/notifications'
import { sendWhatsAppToAll } from '@/lib/notifications/ownerPhones'
import type { WhatsAppSendMeta } from '@/lib/whatsapp/types'

/** Owner alerts that need their own dedupe key, separate from the new-booking row. */
export type OwnerAlertEvent = 'cancelled' | 'request' | 'inquiry'

/** Dedupe key stored in `notifications_log.booking_id` for a non-new-booking alert. */
export function bookingAlertNotificationKey(
  bookingId: number | string,
  event: OwnerAlertEvent,
): string {
  return `${bookingId}:${event}`
}

export interface OwnerBookingAlertFields {
  guestName: string
  guestPhone?: string
  arrival: string
  departure?: string
  roomName?: string | null
  bookingId: number | string
  numAdult?: number
}

/** Hebrew WhatsApp body for a new confirmed booking (owner). */
export function buildOwnerNewBookingMessage(fields: OwnerBookingAlertFields): string {
  return [
    '🔔 הזמנה חדשה!',
    `👤 אורח: ${fields.guestName}`,
    `📱 טלפון: ${fields.guestPhone || 'לא צוין'}`,
    `📅 כניסה: ${fields.arrival}`,
    fields.departure ? `📅 יציאה: ${fields.departure}` : '',
    fields.roomName ? `🏠 יחידה: ${fields.roomName}` : '',
    fields.numAdult ? `👥 מספר אורחים: ${fields.numAdult}` : '',
    `🔖 מספר הזמנה: ${fields.bookingId}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Hebrew WhatsApp body for a cancelled booking (owner). */
export function buildOwnerCancellationMessage(fields: OwnerBookingAlertFields): string {
  return [
    '🚫 הזמנה בוטלה',
    `👤 אורח: ${fields.guestName}`,
    `📱 טלפון: ${fields.guestPhone || 'לא צוין'}`,
    `📅 כניסה: ${fields.arrival}`,
    fields.departure ? `📅 יציאה: ${fields.departure}` : '',
    fields.roomName ? `🏠 יחידה: ${fields.roomName}` : '',
    `🔖 מספר הזמנה: ${fields.bookingId}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Hebrew WhatsApp body for a channel booking request awaiting the owner's approval. */
export function buildOwnerBookingRequestMessage(fields: OwnerBookingAlertFields): string {
  return [
    '📩 בקשת הזמנה חדשה',
    `👤 אורח: ${fields.guestName}`,
    `📱 טלפון: ${fields.guestPhone || 'לא צוין'}`,
    `📅 כניסה: ${fields.arrival}`,
    fields.departure ? `📅 יציאה: ${fields.departure}` : '',
    fields.roomName ? `🏠 יחידה: ${fields.roomName}` : '',
    fields.numAdult ? `👥 מספר אורחים: ${fields.numAdult}` : '',
    `🔖 מספר הזמנה: ${fields.bookingId}`,
    '⏳ ממתין לאישורך בערוץ ההזמנות',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Hebrew WhatsApp body for an Airbnb/channel inquiry (בירור) — not a firm booking yet. */
export function buildOwnerBookingInquiryMessage(fields: OwnerBookingAlertFields): string {
  return [
    '💬 בירור מאורח',
    `👤 אורח: ${fields.guestName}`,
    `📱 טלפון: ${fields.guestPhone || 'לא צוין'}`,
    fields.arrival
      ? `📅 תאריכים: ${fields.arrival}${fields.departure ? ` → ${fields.departure}` : ''}`
      : '',
    fields.roomName ? `🏠 יחידה: ${fields.roomName}` : '',
    fields.numAdult ? `👥 מספר אורחים: ${fields.numAdult}` : '',
    `🔖 מספר פנייה: ${fields.bookingId}`,
    '📩 יש הודעה חדשה בערוץ (לא הזמנה מאושרת)',
  ]
    .filter(Boolean)
    .join('\n')
}

export interface NotifyOwnerAlertInput {
  bookingId: number | string
  propertyId: number | string
  roomId: number | string
  guestName: string
  guestPhone?: string
  arrival: string
  departure?: string
  numAdult?: number
  /** Optional raw payload stored in notifications_log for debugging. */
  rawPayload?: unknown
}

export interface OwnerAlertResult {
  sent: boolean
  duplicate?: boolean
}

const MESSAGE_BUILDERS: Record<OwnerAlertEvent, (fields: OwnerBookingAlertFields) => string> = {
  cancelled: buildOwnerCancellationMessage,
  request: buildOwnerBookingRequestMessage,
  inquiry: buildOwnerBookingInquiryMessage,
}

const MESSAGE_TYPES: Record<OwnerAlertEvent, NonNullable<WhatsAppSendMeta['messageType']>> = {
  cancelled: 'cancellation_owner',
  request: 'booking_request_owner',
  inquiry: 'inquiry_owner',
}

/**
 * Sends an owner-facing alert to every configured phone (primary + secondary),
 * deduped by `{bookingId}:{event}` so the same event never notifies twice —
 * e.g. a dashboard cancel followed by the Beds24 cancellation webhook.
 */
async function notifyOwnersOfBookingEvent(
  event: OwnerAlertEvent,
  input: NotifyOwnerAlertInput,
): Promise<OwnerAlertResult> {
  const key = bookingAlertNotificationKey(input.bookingId, event)

  if (await isDuplicateNotification(key)) {
    console.log(`⚠️ '${event}' notification already sent for booking ${input.bookingId}`)
    return { sent: false, duplicate: true }
  }

  const ownerInfo = await getOwnerInfoByPropertyRoom(input.propertyId, input.roomId)
  const guestPhone = input.guestPhone || ''

  const { error: insertError } = await insertNotification({
    bookingId: key,
    guestName: input.guestName,
    phone: guestPhone,
    guestEmail: null,
    checkInDate: input.arrival,
    rawPayload: input.rawPayload ?? { event, bookingId: input.bookingId },
  })

  if (insertError) {
    console.error(`❌ Failed to save '${event}' notification:`, insertError)
    // Still attempt WhatsApp — better a possible duplicate than a missed alert
  }

  if (ownerInfo.phoneNumbers.length === 0) {
    console.warn(`⚠️ No owner phone - skipping '${event}' notification`)
    return { sent: false }
  }

  const message = MESSAGE_BUILDERS[event]({
    guestName: input.guestName,
    guestPhone,
    arrival: input.arrival,
    departure: input.departure,
    roomName: ownerInfo.roomName,
    bookingId: input.bookingId,
    numAdult: input.numAdult,
  })

  const results = await sendWhatsAppToAll(ownerInfo.phoneNumbers, message, {
    userId: ownerInfo.userId,
    bookingId: input.bookingId,
    messageType: MESSAGE_TYPES[event],
    recipientRole: 'owner',
    recipientName: input.guestName,
  })
  for (const result of results) {
    if (!result.success) {
      console.error(`❌ '${event}' notification failed for ${result.to}:`, result.error)
    }
  }

  return { sent: true }
}

/** Alerts every owner phone that a booking was cancelled. */
export function notifyOwnersOfBookingCancellation(
  input: NotifyOwnerAlertInput,
): Promise<OwnerAlertResult> {
  return notifyOwnersOfBookingEvent('cancelled', input)
}

/** Alerts every owner phone that a channel booking request needs approval. */
export function notifyOwnersOfBookingRequest(
  input: NotifyOwnerAlertInput,
): Promise<OwnerAlertResult> {
  return notifyOwnersOfBookingEvent('request', input)
}

/** Alerts every owner phone about a channel inquiry / בירור (not a confirmed booking). */
export function notifyOwnersOfBookingInquiry(
  input: NotifyOwnerAlertInput,
): Promise<OwnerAlertResult> {
  return notifyOwnersOfBookingEvent('inquiry', input)
}
