import type { ReservationStatus } from '@/lib/dashboard/types'

/**
 * Beds24 statuses the dashboard calendar should fetch.
 * Airbnb "Request to Book" is imported as `inquiry`; channel booking requests
 * awaiting host confirmation are `request`. Default GET /bookings often omits both.
 *
 * NOTE: Beds24 API V2 accepts only one `status` value per query parameter.
 * Use `CALENDAR_BOOKING_STATUS_LIST` with URLSearchParams.append() to send
 * multiple statuses as separate params: ?status=confirmed&status=new&…
 */
export const CALENDAR_BOOKING_STATUS_LIST = ['confirmed', 'new', 'request', 'inquiry'] as const
/** @deprecated Use CALENDAR_BOOKING_STATUS_LIST — comma-separated is not valid for Beds24 V2 API */
export const CALENDAR_BOOKING_STATUSES = CALENDAR_BOOKING_STATUS_LIST.join(',')

/** Channel request (Beds24 3) or Airbnb inquiry/request-to-book (Beds24 5). */
export function isAwaitingApprovalStatus(status: ReservationStatus | string): boolean {
  return status === 'request' || status === 'inquiry'
}

/**
 * Whether this status occupies nights on the calendar (blocks date selection).
 * Inquiry does not block the room in Beds24 — it is overlay-only.
 */
export function occupiesCalendarNight(status: ReservationStatus | string): boolean {
  return status === 'confirmed' || status === 'pending' || status === 'request'
}

/** Confirmed/pending stays count toward revenue; requests and inquiries do not. */
export function countsTowardRevenue(status: ReservationStatus | string): boolean {
  return status === 'confirmed' || status === 'pending'
}

/**
 * Beds24 POST /bookings can set status to `confirmed` (1) for Requests (3) and Inquiries (5).
 * For Airbnb "Request to Book" (imported as inquiry), changing status to 1 accepts the request,
 * and changing to 0 (cancelled) declines it.
 */
export function canConfirmViaBeds24Api(status: ReservationStatus | string): boolean {
  return status === 'request' || status === 'inquiry'
}
