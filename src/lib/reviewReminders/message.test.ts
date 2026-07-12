import { describe, it, expect } from 'vitest'
import { buildReviewReminderMessage } from './message'

describe('buildReviewReminderMessage', () => {
  it('includes the Google review link for a direct booking', () => {
    const message = buildReviewReminderMessage({
      guestName: 'יוסי כהן',
      propertyName: 'Mountain View',
      channel: 'direct',
      googleReviewUrl: 'https://g.page/r/abc123',
    })

    expect(message).toContain('יוסי כהן')
    expect(message).toContain('Mountain View')
    expect(message).toContain('https://g.page/r/abc123')
    expect(message).toContain('ביקורת בגוגל')
    expect(message).toContain('👉 לחצו כאן: https://g.page/r/abc123')
  })

  it('treats an unknown/"other" channel the same as direct (Google review ask)', () => {
    const message = buildReviewReminderMessage({
      guestName: 'דנה לוי',
      propertyName: 'Mountain View',
      channel: 'other',
      googleReviewUrl: 'https://g.page/r/abc123',
    })

    expect(message).toContain('ביקורת בגוגל')
    expect(message).toContain('https://g.page/r/abc123')
  })

  it('omits the review-link line (but still asks for feedback) when no Google review URL is configured', () => {
    const message = buildReviewReminderMessage({
      guestName: 'יוסי כהן',
      propertyName: 'Mountain View',
      channel: 'direct',
      googleReviewUrl: null,
    })

    expect(message).not.toContain('לחצו כאן')
    expect(message).not.toContain('ביקורת בגוגל')
    expect(message).toContain('נשמח מאוד לשמוע ולהשתפר')
  })

  it('asks for an Airbnb review (no link) for an Airbnb booking', () => {
    const message = buildReviewReminderMessage({
      guestName: 'John Smith',
      propertyName: 'Mountain View',
      channel: 'airbnb',
      googleReviewUrl: 'https://g.page/r/abc123',
    })

    expect(message).toContain('Airbnb')
    expect(message).not.toContain('https://g.page/r/abc123')
    expect(message).not.toContain('גוגל')
  })

  it('asks for a Booking.com review (no link) for a Booking.com booking', () => {
    const message = buildReviewReminderMessage({
      guestName: 'John Smith',
      propertyName: 'Mountain View',
      channel: 'booking.com',
      googleReviewUrl: 'https://g.page/r/abc123',
    })

    expect(message).toContain('Booking.com')
    expect(message).not.toContain('https://g.page/r/abc123')
  })

  it('always thanks the guest and mentions the property name', () => {
    const message = buildReviewReminderMessage({
      guestName: 'נועה',
      propertyName: 'Cabin 3',
      channel: 'airbnb',
    })

    expect(message).toContain('תודה שהתארחתם בCabin 3')
    expect(message).toContain('נועה')
    expect(message).toContain('מקווים לראותכם שוב')
  })
})
