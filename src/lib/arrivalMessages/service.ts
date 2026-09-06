/**
 * Arrival-messages orchestrator — separated from the HTTP layer.
 * For each host: fetch today's arrivals from Beds24 → check settings →
 * dedup → send photo + caption + optional house-rules → log.
 */

import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { isConfirmedBookingStatus } from '@/lib/bookings/normalizer'
import {
  isArrivalMessageAlreadyProcessed,
  insertArrivalMessageLog,
  getArrivalMessageSettings,
} from '@/lib/db/arrivalMessages'
import { buildArrivalCaption, buildHouseRulesMessage } from './message'
import type { UserWithBeds24Access } from '@/lib/db/users'

const BEDS24_BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

export interface ArrivalMessageRunSummary {
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
  [key: string]: unknown
}

/** Fetch bookings whose arrival date is exactly `dateStr` (YYYY-MM-DD). */
async function fetchArrivingBookings(
  propertyId: string,
  dateStr: string,
  accessToken: string,
  refreshToken: string,
  userId: string,
): Promise<Beds24BookingLike[]> {
  const url = new URL(`${BEDS24_BASE_URL}/bookings`)
  url.searchParams.set('propertyId', propertyId)
  url.searchParams.set('arrivalFrom', dateStr)
  url.searchParams.set('arrivalTo', dateStr)

  const response = await fetchWithTokenRefresh(
    url.toString(),
    { headers: { 'content-type': 'application/json' } },
    { accessToken, refreshToken },
    userId,
  )

  if (!response.ok) {
    console.error(`[ArrivalMessages] Beds24 /bookings returned ${response.status} for user ${userId}`)
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

function extractGuestPhone(booking: Beds24BookingLike): string {
  const raw = String(booking.mobile || booking.phone || '')
  return raw ? normalizePhoneNumber(raw) : ''
}

function extractGuestName(booking: Beds24BookingLike): string {
  return `${booking.firstName ?? ''} ${booking.lastName ?? ''}`.trim() || 'אורח/ת'
}

/** Processes a single booking: skip / send / log. Never throws. */
async function processBooking(
  booking: Beds24BookingLike,
  user: UserWithBeds24Access,
  dateStr: string,
  settings: Awaited<ReturnType<typeof getArrivalMessageSettings>>,
  summary: ArrivalMessageRunSummary,
): Promise<void> {
  if (!isConfirmedBookingStatus(String(booking.status ?? ''))) {
    summary.skipped++
    return
  }

  if (await isArrivalMessageAlreadyProcessed(booking.id)) {
    summary.skipped++
    return
  }

  const guestName = extractGuestName(booking)
  const guestPhone = extractGuestPhone(booking)

  if (!guestPhone) {
    summary.skipped++
    await insertArrivalMessageLog({
      bookingId: booking.id,
      userId: user.id,
      guestName,
      guestPhone: null,
      checkInDate: dateStr,
      status: 'skipped_no_phone',
    })
    return
  }

  const messageInput = {
    guestName,
    propertyName: user.displayName || 'הנכס שלנו',
    introText: settings?.introText ?? null,
    wazeLink: settings?.wazeLink ?? null,
    houseRules: settings?.houseRules ?? null,
  }

  const caption = buildArrivalCaption(messageInput)
  const photoUrl = settings?.photoUrl ?? null

  // Send photo + caption (single message)
  const result1 = await sendWhatsAppMessage(
    { to: guestPhone, message: caption, image: photoUrl ?? undefined, caption },
    {
      userId: user.id,
      bookingId: booking.id,
      messageType: 'arrival_day_guest',
      recipientRole: 'guest',
      recipientName: guestName,
    },
  )

  if (!result1.success) {
    await insertArrivalMessageLog({
      bookingId: booking.id,
      userId: user.id,
      guestName,
      guestPhone,
      checkInDate: dateStr,
      status: 'failed',
      whatsappError: result1.error ?? null,
    })
    summary.failed++
    return
  }

  await insertArrivalMessageLog({
    bookingId: booking.id,
    userId: user.id,
    guestName,
    guestPhone,
    checkInDate: dateStr,
    status: 'sent',
  })
  summary.sent++
}

/**
 * Main per-user orchestrator called by the cron route.
 * Returns a summary; never throws.
 */
export async function processArrivalMessagesForUser(
  user: UserWithBeds24Access,
  dateStr: string,
): Promise<ArrivalMessageRunSummary> {
  const summary: ArrivalMessageRunSummary = {
    userId: user.id,
    bookingsFound: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  }

  const settings = await getArrivalMessageSettings(user.id)

  // Skip entirely if automation is disabled or photo not set
  if (!settings?.enabled || !settings.photoUrl) {
    return summary
  }

  let bookings: Beds24BookingLike[] = []
  try {
    bookings = await fetchArrivingBookings(
      user.propertyId,
      dateStr,
      user.beds24Token,
      user.beds24RefreshToken,
      user.id,
    )
  } catch (err) {
    console.error(`[ArrivalMessages] Failed to fetch bookings for user ${user.id}:`, err)
    return summary
  }

  summary.bookingsFound = bookings.length

  for (const booking of bookings) {
    await processBooking(booking, user, dateStr, settings, summary)
  }

  return summary
}
