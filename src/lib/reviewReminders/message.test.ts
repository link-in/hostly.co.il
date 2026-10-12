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

  it('uses custom review message text with {guestName} and {propertyName} placeholders', () => {
    const message = buildReviewReminderMessage({
      guestName: 'דוד',
      propertyName: 'וילה בגליל',
      channel: 'direct',
      googleReviewUrl: 'https://g.page/r/xyz',
      reviewMessageText: 'תודה רבה שהתארחתם ב{propertyName}! נשמח לשמוע חוות דעת מ{guestName}.',
    })

    expect(message).toContain('שלום דוד! 🏔️')
    expect(message).toContain('תודה רבה שהתארחתם בוילה בגליל! נשמח לשמוע חוות דעת מדוד.')
    expect(message).toContain('👉 לחצו כאן: https://g.page/r/xyz')
    expect(message).toContain('מקווים לראותכם שוב! 🎉')
  })

  it('does not duplicate greeting when custom text starts with a greeting', () => {
    const message = buildReviewReminderMessage({
      guestName: 'שירה',
      propertyName: 'סוויטת נוף',
      channel: 'airbnb',
      reviewMessageText: 'היי {guestName}, תודה שבחרתם ב{propertyName}! היה תענוג לארח אתכם.',
    })

    expect(message).toContain('היי שירה, תודה שבחרתם בסוויטת נוף! היה תענוג לארח אתכם.')
    expect(message).not.toContain('שלום שירה! 🏔️')
    expect(message).toContain('Airbnb')
    expect(message).toContain('מקווים לראותכם שוב! 🎉')
  })

  it('does not duplicate closing when custom text already has closing', () => {
    const message = buildReviewReminderMessage({
      guestName: 'אבי',
      propertyName: 'צימר הרים',
      channel: 'direct',
      googleReviewUrl: 'https://g.page/r/abc',
      reviewMessageText: 'תודה שהתארחתם! נשמח לראותכם שוב בקרוב.',
    })

    expect(message).toContain('נשמח לראותכם שוב בקרוב.')
    // Should not have the default closing appended separately
    expect(message).not.toContain('מקווים לראותכם שוב! 🎉')
  })

  it('falls back to default message when reviewMessageText is whitespace only', () => {
    const message = buildReviewReminderMessage({
      guestName: 'יוסי כהן',
      propertyName: 'Mountain View',
      channel: 'direct',
      googleReviewUrl: 'https://g.page/r/abc123',
      reviewMessageText: '   ',
    })

    expect(message).toContain('תודה שהתארחתם בMountain View! מקווים שנהניתם ושהרגשתם בבית 😊')
    expect(message).toContain('אם היה משהו שאפשר לשפר – נשמח מאוד לשמוע ולהשתפר 🙏')
    expect(message).toContain('👉 לחצו כאן: https://g.page/r/abc123')
  })
})
