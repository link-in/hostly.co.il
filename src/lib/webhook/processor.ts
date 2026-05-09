/**
 * Webhook business logic — separated from the HTTP layer.
 * Orchestrates: deduplication → DB save → customer upsert → cache refresh → WhatsApp.
 */

import { isDuplicateNotification, insertNotification, updateNotificationStatus } from '@/lib/db/notifications'
import { getUserIdByPropertyRoom, getOwnerInfoByPropertyRoom } from '@/lib/db/users'
import { addOrUpdateCustomer } from '@/lib/customers/addOrUpdateCustomer'
import { refreshRoomCache } from '@/lib/availability/cache'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { parseBookingSource, isConfirmedBookingStatus } from '@/lib/bookings/normalizer'
import type { Beds24Booking, Beds24WebhookWrapper } from './types'

export type { Beds24Booking, Beds24WebhookWrapper }

export interface WebhookResult {
  success: boolean
  message: string
  duplicate?: boolean
  skipped?: boolean
}

/** Main entry point — processes one Beds24 webhook event end-to-end. */
export async function processWebhook(webhookData: Beds24WebhookWrapper): Promise<WebhookResult> {
  const { booking } = webhookData

  if (await isDuplicateNotification(booking.id)) {
    console.log(`⚠️ Duplicate webhook for booking ${booking.id}`)
    return { success: true, message: `Booking ${booking.id} already processed`, duplicate: true }
  }

  if (!isConfirmedBookingStatus(booking.status)) {
    console.log(`⚠️ Skipping booking with status: ${booking.status}`)
    return { success: true, message: `Booking status '${booking.status}' skipped`, skipped: true }
  }

  const guestName = `${booking.firstName} ${booking.lastName}`.trim()
  const guestPhoneRaw = booking.mobile || booking.phone || ''
  const guestPhone = guestPhoneRaw ? normalizePhoneNumber(guestPhoneRaw) : ''
  const guestEmail = booking.email || ''

  const { id: notificationId, error: insertError } = await insertNotification({
    bookingId: booking.id,
    guestName,
    phone: guestPhone,
    guestEmail: guestEmail || null,
    checkInDate: booking.arrival,
    rawPayload: webhookData,
  })

  if (insertError) {
    console.error('❌ Failed to save notification:', insertError)
    return { success: false, message: `Failed to save: ${insertError}` }
  }

  const userId = await getUserIdByPropertyRoom(booking.propertyId, booking.roomId)

  await maybeSaveCustomer(userId, guestName, guestPhone, guestEmail, booking)
  maybeRefreshCache(userId, booking)

  const ownerInfo = await getOwnerInfoByPropertyRoom(booking.propertyId, booking.roomId)
  const guestResult = await sendGuestNotification(guestPhone, guestName, ownerInfo.roomName, booking.arrival)
  await sendOwnerNotification(ownerInfo.phoneNumber, guestName, guestPhone, booking, ownerInfo.roomName)

  if (notificationId) {
    await updateNotificationStatus(notificationId, {
      success: guestResult.success,
      whatsappError: guestResult.error,
    })
  }

  return { success: true, message: 'Webhook processed successfully' }
}

async function maybeSaveCustomer(
  userId: string | null,
  guestName: string,
  guestPhone: string,
  guestEmail: string,
  booking: Beds24Booking,
): Promise<void> {
  if (!userId || !guestName) return
  const result = await addOrUpdateCustomer({
    userId,
    fullName: guestName,
    phone: guestPhone || null,
    email: guestEmail || null,
    bookingDate: booking.arrival || new Date().toISOString(),
    bookingSource: parseBookingSource(booking.apiSource),
  })
  if (result.success) {
    console.log('✅ Customer saved from webhook:', result.customerId)
  } else {
    console.error('❌ Failed to save customer:', result.error)
  }
}

function maybeRefreshCache(userId: string | null, booking: Beds24Booking): void {
  if (!userId) return
  const accessToken = process.env.BEDS24_TOKEN
  const refreshToken = process.env.BEDS24_REFRESH_TOKEN
  if (!accessToken || !refreshToken) return

  refreshRoomCache(
    userId,
    String(booking.propertyId),
    String(booking.roomId),
    accessToken,
    refreshToken,
  )
    .then((r) => console.log(`[Cache] refreshed ${r.upserted} rows for room ${booking.roomId}`))
    .catch((e) => console.error('[Cache] refresh failed:', e))
}

async function sendGuestNotification(
  guestPhone: string,
  guestName: string,
  roomName: string | null,
  arrival: string,
): Promise<{ success: boolean; provider: string; error?: string }> {
  if (!guestPhone) {
    console.warn('⚠️ Skipping guest WhatsApp - no phone')
    return { success: false, provider: 'none', error: 'No phone number' }
  }
  const property = roomName ?? 'Mountain View'
  return sendWhatsAppMessage({
    to: guestPhone,
    message: `שלום ${guestName}! 🏔️\n\nקיבלנו את הזמנתך ב-${property}.\n📅 תאריך כניסה: ${arrival}\n\nנשמח לארח אותך! 🎉`,
  })
}

async function sendOwnerNotification(
  ownerPhone: string | null,
  guestName: string,
  guestPhone: string,
  booking: Beds24Booking,
  roomName: string | null,
): Promise<void> {
  if (!ownerPhone) {
    console.warn('⚠️ No owner phone - skipping owner notification')
    return
  }
  const lines = [
    '🔔 הזמנה חדשה!',
    `👤 אורח: ${guestName}`,
    `📱 טלפון: ${guestPhone || 'לא צוין'}`,
    `📅 כניסה: ${booking.arrival}`,
    booking.departure ? `📅 יציאה: ${booking.departure}` : '',
    roomName ? `🏠 יחידה: ${roomName}` : '',
    booking.numAdult ? `👥 מספר אורחים: ${booking.numAdult}` : '',
    `🔖 מספר הזמנה: ${booking.id}`,
  ].filter(Boolean)

  const result = await sendWhatsAppMessage({ to: ownerPhone, message: lines.join('\n') })
  if (!result.success) {
    console.error(`❌ Owner notification failed:`, result.error)
  }
}
