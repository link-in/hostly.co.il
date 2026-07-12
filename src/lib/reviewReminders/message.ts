/**
 * Pure builder for the post-checkout WhatsApp review-request message.
 * No I/O — fully unit-testable.
 */

import type { BookingSource } from '@/lib/bookings/normalizer'

export interface ReviewReminderMessageInput {
  guestName: string
  propertyName: string
  channel: BookingSource
  googleReviewUrl?: string | null
}

const OTA_DISPLAY_NAME: Record<'airbnb' | 'booking.com', string> = {
  airbnb: 'Airbnb',
  'booking.com': 'Booking.com',
}

/** Direct bookings and anything we can't attribute to a known OTA are asked for a Google review. */
function isDirectLikeChannel(channel: BookingSource): boolean {
  return channel === 'direct' || channel === 'other'
}

function buildGoogleReviewAsk(googleReviewUrl?: string | null): string {
  if (!googleReviewUrl) {
    return 'ואם הכל היה מצוין, נשמח מאוד אם תכתבו לנו כמה מילים בתגובה כאן 💬'
  }
  return `ואם הכל היה מצוין, נשמח מאוד אם תרשמו לנו ביקורת בגוגל – זה עוזר לנו המשך :)\n⭐ ${googleReviewUrl}`
}

function buildOtaReviewAsk(channel: 'airbnb' | 'booking.com'): string {
  const appName = OTA_DISPLAY_NAME[channel]
  return `ואם הכל היה מצוין, נשמח מאוד אם תרשמו לנו ביקורת ב-${appName} – זה עוזר לנו המשך :)`
}

/** Builds the full Hebrew WhatsApp message sent the morning after checkout. */
export function buildReviewReminderMessage(input: ReviewReminderMessageInput): string {
  const { guestName, propertyName, channel, googleReviewUrl } = input

  const intro = `שלום ${guestName}! 🏔️\n\nתודה שהתארחתם ב${propertyName}! מקווים שנהניתם ושהרגשתם בבית 😊`
  const feedbackAsk = 'אם היה משהו שאפשר לשפר – נשמח מאוד לשמוע ולהשתפר 🙏'

  const reviewAsk = isDirectLikeChannel(channel)
    ? buildGoogleReviewAsk(googleReviewUrl)
    : buildOtaReviewAsk(channel as 'airbnb' | 'booking.com')

  const closing = 'מקווים לראותכם שוב! 🎉'

  return [intro, feedbackAsk, reviewAsk, closing].join('\n\n')
}
