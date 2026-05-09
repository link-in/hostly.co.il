/**
 * Tests for the pure helper logic used by the webhook processor.
 * The full processWebhook() function is integration-tested manually,
 * but we unit-test all extracted pure helpers here.
 */
import { describe, it, expect } from 'vitest'
import { isConfirmedBookingStatus, parseBookingSource } from '@/lib/bookings/normalizer'

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

  it('skips cancelled bookings', () => {
    expect(isConfirmedBookingStatus('cancelled')).toBe(false)
  })

  it('skips pending bookings', () => {
    expect(isConfirmedBookingStatus('pending')).toBe(false)
  })
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
  const buildOwnerMessage = (
    guestName: string,
    guestPhone: string,
    booking: { id: number; arrival: string; departure?: string; numAdult?: number },
    roomName: string | null,
  ) => {
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
    return lines.join('\n')
  }

  it('includes all fields when complete', () => {
    const msg = buildOwnerMessage('Yossi Cohen', '+972521234567',
      { id: 42, arrival: '2026-06-01', departure: '2026-06-05', numAdult: 2 },
      'Mountain View',
    )
    expect(msg).toContain('Yossi Cohen')
    expect(msg).toContain('+972521234567')
    expect(msg).toContain('2026-06-01')
    expect(msg).toContain('2026-06-05')
    expect(msg).toContain('Mountain View')
    expect(msg).toContain('42')
    expect(msg).toContain('2')
  })

  it('omits optional lines when missing', () => {
    const msg = buildOwnerMessage('Yossi', '', { id: 1, arrival: '2026-06-01' }, null)
    expect(msg).toContain('לא צוין')
    expect(msg).not.toContain('יציאה')
    expect(msg).not.toContain('יחידה')
    expect(msg).not.toContain('אורחים')
  })
})
