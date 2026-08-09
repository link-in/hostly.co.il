/**
 * Tests for the pure helper logic used by the webhook processor.
 * The full processWebhook() function is integration-tested manually,
 * but we unit-test all extracted pure helpers here.
 */
import { describe, it, expect } from 'vitest'
import {
  buildOwnerNewBookingMessage,
  buildOwnerCancellationMessage,
  buildOwnerBookingRequestMessage,
  buildOwnerBookingInquiryMessage,
  bookingAlertNotificationKey,
} from '@/lib/notifications/bookingAlerts'
import {
  isConfirmedBookingStatus,
  isCancelledBookingStatus,
  isBookingRequestStatus,
  isInquiryBookingStatus,
  isBookingModificationWebhook,
  parseBookingSource,
} from '@/lib/bookings/normalizer'

// ─── Status filtering (mirrors processor logic) ───────────────────────────────

describe('Webhook — booking status filtering', () => {
  it('processes confirmed bookings', () => {
    expect(isConfirmedBookingStatus('confirmed')).toBe(true)
  })

  it('processes "new" bookings', () => {
    expect(isConfirmedBookingStatus('new')).toBe(true)
  })

  it('processes Beds24 numeric status "1"', () => {
    expect(isConfirmedBookingStatus('1')).toBe(true)
  })

  it('does not treat cancelled as confirmed', () => {
    expect(isConfirmedBookingStatus('cancelled')).toBe(false)
  })

  it('skips pending bookings', () => {
    expect(isConfirmedBookingStatus('pending')).toBe(false)
  })
})

describe('Webhook — cancellation status filtering', () => {
  it.each(['cancelled', 'CANCELLED', '0'])('detects "%s" as cancelled', (status) => {
    expect(isCancelledBookingStatus(status)).toBe(true)
  })

  it.each(['confirmed', 'new', '1', 'pending'])('does not treat "%s" as cancelled', (status) => {
    expect(isCancelledBookingStatus(status)).toBe(false)
  })
})

describe('Webhook — booking request status filtering', () => {
  it.each(['request', '3'])('detects "%s" as a booking request', (status) => {
    expect(isBookingRequestStatus(status)).toBe(true)
  })

  it.each(['inquiry', '5', 'confirmed', 'new', '1', 'cancelled', '0'])(
    'does not treat "%s" as a booking request',
    (status) => {
      expect(isBookingRequestStatus(status)).toBe(false)
    },
  )
})

// ─── Guest name formatting ────────────────────────────────────────────────────

describe('Webhook — guest name building', () => {
  const buildName = (first: string, last: string) => `${first} ${last}`.trim()

  it('joins first and last name', () => {
    expect(buildName('Yossi', 'Cohen')).toBe('Yossi Cohen')
  })

  it('handles missing last name', () => {
    expect(buildName('Yossi', '')).toBe('Yossi')
  })

  it('handles missing first name', () => {
    expect(buildName('', 'Cohen')).toBe('Cohen')
  })
})

// ─── Booking source parsing ───────────────────────────────────────────────────

describe('Webhook — booking source', () => {
  it('identifies Airbnb bookings', () => {
    expect(parseBookingSource('Airbnb')).toBe('airbnb')
  })

  it('identifies Booking.com bookings', () => {
    expect(parseBookingSource('Booking.com')).toBe('booking.com')
  })

  it('falls back to "other" for unknown sources', () => {
    expect(parseBookingSource('Direct')).toBe('other')
    expect(parseBookingSource('')).toBe('other')
    expect(parseBookingSource(undefined)).toBe('other')
  })
})

// ─── Owner message building ───────────────────────────────────────────────────

describe('Webhook — owner message building', () => {
  it('includes all fields when complete', () => {
    const msg = buildOwnerNewBookingMessage({
      guestName: 'Yossi Cohen',
      guestPhone: '+972521234567',
      arrival: '2026-06-01',
      departure: '2026-06-05',
      roomName: 'Mountain View',
      bookingId: 42,
      numAdult: 2,
    })
    expect(msg).toContain('הזמנה חדשה')
    expect(msg).toContain('Yossi Cohen')
    expect(msg).toContain('+972521234567')
    expect(msg).toContain('2026-06-01')
    expect(msg).toContain('2026-06-05')
    expect(msg).toContain('Mountain View')
    expect(msg).toContain('42')
    expect(msg).toContain('2')
  })

  it('omits optional lines when missing', () => {
    const msg = buildOwnerNewBookingMessage({
      guestName: 'Yossi',
      arrival: '2026-06-01',
      bookingId: 1,
    })
    expect(msg).toContain('לא צוין')
    expect(msg).not.toContain('יציאה')
    expect(msg).not.toContain('יחידה')
    expect(msg).not.toContain('אורחים')
  })
})

describe('Webhook — owner cancellation message', () => {
  it('builds a cancellation alert with booking details', () => {
    const msg = buildOwnerCancellationMessage({
      guestName: 'Yossi Cohen',
      guestPhone: '+972521234567',
      arrival: '2026-06-01',
      departure: '2026-06-05',
      roomName: 'Mountain View',
      bookingId: 42,
    })
    expect(msg).toContain('הזמנה בוטלה')
    expect(msg).toContain('Yossi Cohen')
    expect(msg).toContain('+972521234567')
    expect(msg).toContain('2026-06-01')
    expect(msg).toContain('Mountain View')
    expect(msg).toContain('42')
  })

})

describe('Webhook — owner booking request message', () => {
  it('builds a request alert with booking details', () => {
    const msg = buildOwnerBookingRequestMessage({
      guestName: 'Yossi Cohen',
      guestPhone: '+972521234567',
      arrival: '2026-06-01',
      departure: '2026-06-05',
      roomName: 'Mountain View',
      bookingId: 42,
      numAdult: 2,
    })
    expect(msg).toContain('בקשת הזמנה חדשה')
    expect(msg).toContain('ממתין לאישורך')
    expect(msg).toContain('Yossi Cohen')
    expect(msg).toContain('2026-06-05')
    expect(msg).toContain('Mountain View')
    expect(msg).toContain('42')
  })
})

describe('Webhook — owner inquiry message', () => {
  it('builds a distinct inquiry alert (not a booking request)', () => {
    const msg = buildOwnerBookingInquiryMessage({
      guestName: 'Yossi Cohen',
      guestPhone: '+972521234567',
      arrival: '2026-06-01',
      departure: '2026-06-05',
      roomName: 'Mountain View',
      bookingId: 42,
    })
    expect(msg).toContain('בירור מאורח')
    expect(msg).toContain('לא הזמנה מאושרת')
    expect(msg).not.toContain('בקשת הזמנה חדשה')
    expect(msg).not.toContain('הזמנה חדשה!')
  })
})

describe('Webhook — inquiry status filtering', () => {
  it.each(['inquiry', '5', 'INQUIRY'])('detects "%s" as an inquiry', (status) => {
    expect(isInquiryBookingStatus(status)).toBe(true)
  })

  it.each(['request', '3', 'confirmed', 'new'])('does not treat "%s" as an inquiry', (status) => {
    expect(isInquiryBookingStatus(status)).toBe(false)
  })
})

describe('Webhook — booking modification detection', () => {
  it('treats a later modifiedTime as a chat/update webhook', () => {
    expect(
      isBookingModificationWebhook({
        bookingTime: '2026-08-01T10:00:00Z',
        modifiedTime: '2026-08-01T12:00:00Z',
      }),
    ).toBe(true)
  })

  it('treats near-identical create/modify times as a new booking', () => {
    expect(
      isBookingModificationWebhook({
        bookingTime: '2026-08-01T10:00:00Z',
        modifiedTime: '2026-08-01T10:00:30Z',
      }),
    ).toBe(false)
  })
})

describe('Webhook — owner alert dedupe keys', () => {
  it('separates each event from the new-booking notification row', () => {
    expect(bookingAlertNotificationKey(42, 'cancelled')).toBe('42:cancelled')
    expect(bookingAlertNotificationKey(42, 'request')).toBe('42:request')
    expect(bookingAlertNotificationKey(42, 'inquiry')).toBe('42:inquiry')
  })

  it('keeps cancellation, request and inquiry alerts independent', () => {
    expect(bookingAlertNotificationKey(42, 'cancelled')).not.toBe(
      bookingAlertNotificationKey(42, 'request'),
    )
    expect(bookingAlertNotificationKey(42, 'request')).not.toBe(
      bookingAlertNotificationKey(42, 'inquiry'),
    )
  })
})
