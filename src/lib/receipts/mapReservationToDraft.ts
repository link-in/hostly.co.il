import type { Reservation } from '@/lib/dashboard/types'
import type { ReceiptDraft } from './types'

/**
 * Build a modal draft from an existing dashboard reservation.
 * Amount defaults to reservation.total; description includes stay dates + booking id.
 */
export function mapReservationToDraft(reservation: Reservation): ReceiptDraft {
  const checkIn = reservation.checkIn || ''
  const checkOut = reservation.checkOut || ''
  const stay =
    checkIn && checkOut ? `${checkIn} עד ${checkOut}` : checkIn || checkOut || ''
  const nights =
    typeof reservation.nights === 'number' && reservation.nights > 0
      ? ` (${reservation.nights} לילות)`
      : ''

  const descriptionParts = [
    'אירוח',
    stay ? `— ${stay}${nights}` : '',
    reservation.unitName ? `— ${reservation.unitName}` : '',
    `— הזמנה #${reservation.id}`,
  ].filter(Boolean)

  return {
    bookingId: reservation.id,
    customerName: reservation.guestName?.trim() || 'אורח',
    customerEmail: reservation.email?.trim() || '',
    customerPhone: reservation.phone?.trim() || '',
    amount: Number.isFinite(reservation.total) ? reservation.total : 0,
    description: descriptionParts.join(' ').replace(/\s+/g, ' ').trim(),
    documentType: 'receipt',
    paymentMethod: 'cash',
  }
}
