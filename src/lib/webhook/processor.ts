/**
 * Webhook business logic — separated from the HTTP layer.
 * Orchestrates: deduplication → DB save → customer upsert → cache refresh → WhatsApp.
 */

import { isDuplicateNotification, insertNotification, updateNotificationStatus } from '@/lib/db/notifications'
import { getUserIdByPropertyRoom, getOwnerInfoByPropertyRoom, getUserBeds24Tokens } from '@/lib/db/users'
import { addOrUpdateCustomer } from '@/lib/customers/addOrUpdateCustomer'
import { refreshRoomCache } from '@/lib/availability/cache'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendWhatsAppToAll } from '@/lib/notifications/ownerPhones'
import {
  buildOwnerNewBookingMessage,
  notifyOwnersOfBookingCancellation,
  notifyOwnersOfBookingInquiry,
  notifyOwnersOfBookingRequest,
  type NotifyOwnerAlertInput,
  type OwnerAlertResult,
} from '@/lib/notifications/bookingAlerts'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import {
  extractBookingSource,
  isConfirmedBookingStatus,
  isCancelledBookingStatus,
  isBookingRequestStatus,
  isInquiryBookingStatus,
} from '@/lib/bookings/normalizer'
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

  if (isCancelledBookingStatus(booking.status)) {
    return processOwnerAlertOnly(webhookData, 'cancellation', notifyOwnersOfBookingCancellation)
  }

  if (isBookingRequestStatus(booking.status)) {
    return processOwnerAlertOnly(webhookData, 'booking request', notifyOwnersOfBookingRequest)
  }

  if (isInquiryBookingStatus(booking.status)) {
    return processOwnerAlertOnly(webhookData, 'booking inquiry', notifyOwnersOfBookingInquiry)
  }

  if (await isDuplicateNotification(booking.id)) {
    console.log(`⚠️ Duplicate webhook for booking ${booking.id}`)
    // Still upsert the customer — covers cases where WhatsApp already ran but
    // customer save failed, or the guest was missing from the CRM.
    const userId = await getUserIdByPropertyRoom(booking.propertyId, booking.roomId)
    const guestName = `${booking.firstName} ${booking.lastName}`.trim()
    const guestPhoneRaw = booking.mobile || booking.phone || ''
    const guestPhone = guestPhoneRaw ? normalizePhoneNumber(guestPhoneRaw) : ''
    const guestEmail = booking.email || ''
    if (guestName) {
      await maybeSaveCustomer(userId, guestName, guestPhone, guestEmail, booking)
    }
    maybeRefreshCache(userId, booking).catch((e) => console.error('[Cache] refresh failed:', e))
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
  const guestResult = await sendGuestNotification(
    guestPhone,
    guestName,
    ownerInfo.roomName,
    booking.arrival,
    { userId: userId ?? ownerInfo.userId, bookingId: booking.id },
  )
  await sendOwnerNotification(
    ownerInfo.phoneNumbers,
    guestName,
    guestPhone,
    booking,
    ownerInfo.roomName,
    { userId: userId ?? ownerInfo.userId, bookingId: booking.id },
  )

  if (notificationId) {
    await updateNotificationStatus(notificationId, {
      success: guestResult.success,
      whatsappError: guestResult.error,
    })
  }

  return { success: true, message: 'Webhook processed successfully' }
}

/**
 * Handles statuses that only affect the owner (cancellation, booking request, inquiry):
 * refresh the availability cache and alert the owner phones — no guest message
 * and no customer record for non-confirmed events.
 *
 * Each event has its own dedupe key (`{id}:cancelled`, `{id}:request`, `{id}:inquiry`),
 * so a prior "new booking" row never blocks these alerts.
 */
async function processOwnerAlertOnly(
  webhookData: Beds24WebhookWrapper,
  label: string,
  notifyOwners: (input: NotifyOwnerAlertInput) => Promise<OwnerAlertResult>,
): Promise<WebhookResult> {
  const { booking } = webhookData
  const guestName = `${booking.firstName} ${booking.lastName}`.trim() || 'אורח'
  const guestPhoneRaw = booking.mobile || booking.phone || ''
  const guestPhone = guestPhoneRaw ? normalizePhoneNumber(guestPhoneRaw) : ''

  console.log(`📣 Processing ${label} for booking ${booking.id}`)

  const userId = await getUserIdByPropertyRoom(booking.propertyId, booking.roomId)
  // Always refresh cache — even when WhatsApp was already sent from another flow
  maybeRefreshCache(userId, booking).catch((e) => console.error('[Cache] refresh failed:', e))

  const result = await notifyOwners({
    bookingId: booking.id,
    propertyId: booking.propertyId,
    roomId: booking.roomId,
    guestName,
    guestPhone,
    arrival: booking.arrival,
    departure: booking.departure,
    numAdult: booking.numAdult,
    rawPayload: webhookData,
  })

  if (result.duplicate) {
    return {
      success: true,
      message: `Booking ${booking.id} ${label} already notified`,
      duplicate: true,
    }
  }

  return { success: true, message: `Booking ${label} processed successfully` }
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
    bookingSource: extractBookingSource(booking as unknown as Record<string, unknown>),
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
  meta: { userId?: string | null; bookingId: number | string },
): Promise<{ success: boolean; provider: string; error?: string }> {
  if (!guestPhone) {
    console.warn('⚠️ Skipping guest WhatsApp - no phone')
    return { success: false, provider: 'none', error: 'No phone number' }
  }
  const property = roomName ?? 'Mountain View'
  return sendWhatsAppMessage(
    {
      to: guestPhone,
      message: `שלום ${guestName}! 🏔️\n\nקיבלנו את הזמנתך ב-${property}.\n📅 תאריך כניסה: ${arrival}\n\nנשמח לארח אותך! 🎉`,
    },
    {
      userId: meta.userId,
      bookingId: meta.bookingId,
      messageType: 'new_booking_guest',
      recipientRole: 'guest',
      recipientName: guestName,
    },
  )
}

async function sendOwnerNotification(
  ownerPhones: string[],
  guestName: string,
  guestPhone: string,
  booking: Beds24Booking,
  roomName: string | null,
  meta: { userId?: string | null; bookingId: number | string },
): Promise<void> {
  if (ownerPhones.length === 0) {
    console.warn('⚠️ No owner phone - skipping owner notification')
    return
  }

  const message = buildOwnerNewBookingMessage({
    guestName,
    guestPhone,
    arrival: booking.arrival,
    departure: booking.departure,
    roomName,
    bookingId: booking.id,
    numAdult: booking.numAdult,
  })

  const results = await sendWhatsAppToAll(ownerPhones, message, {
    userId: meta.userId,
    bookingId: meta.bookingId,
    messageType: 'new_booking_owner',
    recipientRole: 'owner',
    recipientName: guestName,
  })
  for (const result of results) {
    if (!result.success) {
      console.error(`❌ Owner notification failed for ${result.to}:`, result.error)
    }
  }
}
