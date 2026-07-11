/**
 * Webhook business logic — separated from the HTTP layer.
 * Orchestrates: deduplication → DB save → customer upsert → cache refresh → WhatsApp.
 */

import { isDuplicateNotification, insertNotification, updateNotificationStatus } from '@/lib/db/notifications'
import { getUserIdByPropertyRoom, getOwnerInfoByPropertyRoom, getUserBeds24Tokens } from '@/lib/db/users'
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
  maybeRefreshCache(userId, booking).catch((e) => console.error('[Cache] refresh failed:', e))

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

/**
 * Refreshes the availability cache for the room affected by this booking.
 * Prefers the specific user's own Beds24 tokens (required in multi-tenant
 * setups where each owner has a separate Beds24 account) and falls back to
 * the global env tokens only when the user has none configured.
 */
async function maybeRefreshCache(userId: string | null, booking: Beds24Booking): Promise<void> {
  if (!userId) return

  const userTokens = await getUserBeds24Tokens(userId)
  const accessToken = userTokens.accessToken || process.env.BEDS24_TOKEN
  const refreshToken = userTokens.refreshToken || process.env.BEDS24_REFRESH_TOKEN
  if (!accessToken || !refreshToken) return

  const r = await refreshRoomCache(
    userId,
    String(booking.propertyId),
    String(booking.roomId),
    accessToken,
    refreshToken,
  )
  console.log(`[Cache] refreshed ${r.upserted} rows for room ${booking.roomId}`)
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
