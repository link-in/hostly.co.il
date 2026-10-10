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
  reviewMessageText?: string | null
}

export const DEFAULT_REVIEW_TEXT_TEMPLATE =
  'תודה שהתארחתם ב{propertyName}! מקווים שנהניתם ושהרגשתם בבית 😊\n\nאם היה משהו שאפשר לשפר – נשמח מאוד לשמוע ולהשתפר 🙏'

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
  return `ואם הכל היה מצוין, נשמח מאוד אם תרשמו לנו ביקורת בגוגל – זה עוזר לנו המשך :)\n👉 לחצו כאן: ${googleReviewUrl}`
}

function buildOtaReviewAsk(channel: 'airbnb' | 'booking.com'): string {
  const appName = OTA_DISPLAY_NAME[channel]
  return `ואם הכל היה מצוין, נשמח מאוד אם תרשמו לנו ביקורת ב-${appName} – זה עוזר לנו המשך :)`
}

/**
 * Interpolates template variables in custom message text.
 * Supported variables: {guestName}, {propertyName}, {guest_name}, {property_name}.
 */
function interpolateVariables(
  template: string,
  variables: { guestName: string; propertyName: string },
): string {
  return template
    .replace(/\{guestName\}|\{guest_name\}/g, variables.guestName)
    .replace(/\{propertyName\}|\{property_name\}/g, variables.propertyName)
}

/** Builds the full Hebrew WhatsApp message sent the morning after checkout. */
export function buildReviewReminderMessage(input: ReviewReminderMessageInput): string {
  const { guestName, propertyName, channel, googleReviewUrl, reviewMessageText } = input

  const reviewAsk = isDirectLikeChannel(channel)
    ? buildGoogleReviewAsk(googleReviewUrl)
    : buildOtaReviewAsk(channel as 'airbnb' | 'booking.com')

  const defaultClosing = 'מקווים לראותכם שוב! 🎉'

  // If no custom text provided, use standard default message
  if (!reviewMessageText || !reviewMessageText.trim()) {
    const intro = `שלום ${guestName}! 🏔️\n\nתודה שהתארחתם ב${propertyName}! מקווים שנהניתם ושהרגשתם בבית 😊`
    const feedbackAsk = 'אם היה משהו שאפשר לשפר – נשמח מאוד לשמוע ולהשתפר 🙏'
    return [intro, feedbackAsk, reviewAsk, defaultClosing].join('\n\n')
  }

  // Format custom text with variable interpolation
  let body = interpolateVariables(reviewMessageText.trim(), { guestName, propertyName })

  // Prepend greeting if the custom text does not already start with one
  const hasGreeting = /^(שלום|היי|בוקר טוב|ערב טוב|אהלן)/.test(body)
  if (!hasGreeting) {
    body = `שלום ${guestName}! 🏔️\n\n${body}`
  }

  const parts: string[] = [body]

  // Add review request
  parts.push(reviewAsk)

  // Append closing if custom text does not already include one
  const hasClosing = /מקווים לראותכם|נשמח לראותכם|להתראות|בברכה/.test(body)
  if (!hasClosing) {
    parts.push(defaultClosing)
  }

  return parts.join('\n\n')
}
