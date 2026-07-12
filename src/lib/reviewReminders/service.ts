/**
 * Review-reminders orchestrator — separated from the HTTP layer.
 * For a single host: fetch yesterday's checkouts from Beds24 → dedupe →
 * build the right message per booking channel → send via WhatsApp → log.
 */

import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { parseBookingSource, isConfirmedBookingStatus } from '@/lib/bookings/normalizer'
import type { BookingSource } from '@/lib/bookings/normalizer'
import { isReviewReminderAlreadyProcessed, insertReviewReminderLog } from '@/lib/db/reviewReminders'
import { buildReviewReminderMessage } from './message'
import type { UserWithBeds24Access } from '@/lib/db/users'

const BEDS24_BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

export interface ReviewReminderRunSummary {
  userId: string
  bookingsFound: number
  sent: number
  skipped: number
  failed: number
}

interface Beds24BookingLike {
  id: number | string
  status?: string
  firstName?: string
  lastName?: string
  mobile?: string
  phone?: string
  apiSource?: string
  [key: string]: unknown
}

/** Fetch bookings from Beds24 whose departure date is exactly `dateStr` (YYYY-MM-DD). */
async function fetchCheckedOutBookings(
  propertyId: string,
  dateStr: string,
  accessToken: string,
  refreshToken: string,
  userId: string,
): Promise<Beds24BookingLike[]> {
  const url = new URL(`${BEDS24_BASE_URL}/bookings`)
  url.searchParams.set('propertyId', propertyId)
  url.searchParams.set('departureFrom', dateStr)
  url.searchParams.set('departureTo', dateStr)

  const response = await fetchWithTokenRefresh(
    url.toString(),
    { headers: { 'content-type': 'application/json' } },
    { accessToken, refreshToken },
    userId,
  )

  if (!response.ok) {
    console.error(`[ReviewReminders] Beds24 /bookings returned ${response.status} for user ${userId}`)
    return []
  }

  const data = (await response.json()) as { data?: unknown[] } | unknown[]
  const bookings: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] }).data)
      ? (data as { data: unknown[] }).data
      : []

  return bookings as Beds24BookingLike[]
}

/** Extracts guest name/phone + booking channel from a raw Beds24 booking row. */
function extractGuestInfo(booking: Beds24BookingLike): {
  guestName: string
  guestPhone: string
  channel: BookingSource
} {
  const guestName = `${booking.firstName ?? ''} ${booking.lastName ?? ''}`.trim() || 'אורח/ת'
  const guestPhoneRaw = String(booking.mobile || booking.phone || '')
  const guestPhone = guestPhoneRaw ? normalizePhoneNumber(guestPhoneRaw) : ''
  const channel = parseBookingSource(booking.apiSource)
  return { guestName, guestPhone, channel }
}

/** Processes a single booking: skip/send/log. Never throws — errors are logged and counted as failed. */
async function processBooking(
  booking: Beds24BookingLike,
  user: UserWithBeds24Access,
  dateStr: string,
  summary: ReviewReminderRunSummary,
): Promise<void> {
  if (!isConfirmedBookingStatus(String(booking.status ?? ''))) {
    summary.skipped++
    return
  }

  if (await isReviewReminderAlreadyProcessed(booking.id)) {
    summary.skipped++
    return
  }

  const { guestName, guestPhone, channel } = extractGuestInfo(booking)

  if (!guestPhone) {
    summary.skipped++
    await insertReviewReminderLog({
      bookingId: booking.id,
      userId: user.id,
      guestName,
      guestPhone: null,
      channel,
      checkOutDate: dateStr,
      status: 'skipped_no_phone',
    })
    return
  }

  const message = buildReviewReminderMessage({
    guestName,
    propertyName: user.displayName || 'הנכס שלנו',
    channel,
    googleReviewUrl: user.googleReviewUrl,
  })

  const result = await sendWhatsAppMessage({ to: guestPhone, message })

  await insertReviewReminderLog({
    bookingId: booking.id,
    userId: user.id,
    guestName,
    guestPhone,
    channel,
    checkOutDate: dateStr,
    status: result.success ? 'sent' : 'failed',
    whatsappError: result.error ?? null,
  })

  if (result.success) summary.sent++
  else summary.failed++
}

/**
 * Sends the post-checkout review-request WhatsApp message to every guest who
 * checked out on `dateStr` (YYYY-MM-DD) for the given host. Safe to re-run —
 * already-processed bookings are skipped via `review_reminders_log`.
 */
export async function processReviewRemindersForUser(
  user: UserWithBeds24Access,
  dateStr: string,
): Promise<ReviewReminderRunSummary> {
  const summary: ReviewReminderRunSummary = {
    userId: user.id,
    bookingsFound: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  }

  let bookings: Beds24BookingLike[] = []
  try {
    bookings = await fetchCheckedOutBookings(
      user.propertyId,
      dateStr,
      user.beds24Token,
      user.beds24RefreshToken,
      user.id,
    )
  } catch (err) {
    console.error(`[ReviewReminders] Failed to fetch bookings for user ${user.id}:`, err)
    return summary
  }

  summary.bookingsFound = bookings.length

  for (const booking of bookings) {
    await processBooking(booking, user, dateStr, summary)
  }

  return summary
}
