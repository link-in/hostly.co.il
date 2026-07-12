import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { buildReviewReminderMessage } from '@/lib/reviewReminders/message'
import type { BookingSource } from '@/lib/bookings/normalizer'

const VALID_CHANNELS: BookingSource[] = ['direct', 'other', 'airbnb', 'booking.com']

/**
 * POST /api/dashboard/review-reminders/test-send
 * Sends a preview of the post-checkout review-reminder message to the
 * logged-in host's own WhatsApp number, using placeholder guest data.
 * Never touches Beds24 or real guest data — safe to click any time.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.user.phoneNumber) {
    return NextResponse.json(
      { error: 'לא הוגדר מספר WhatsApp בפרופיל שלך — הוסף מספר טלפון כדי לקבל הודעת בדיקה' },
      { status: 400 },
    )
  }

  let payload: { channel?: string } = {}
  try {
    payload = await request.json()
  } catch {
    // Body is optional — default to 'direct' below.
  }

  const channel: BookingSource = VALID_CHANNELS.includes(payload.channel as BookingSource)
    ? (payload.channel as BookingSource)
    : 'direct'

  const message = buildReviewReminderMessage({
    guestName: 'אורח/ת בדיקה',
    propertyName: session.user.displayName || 'הנכס שלנו',
    channel,
    googleReviewUrl: session.user.googleReviewUrl,
  })

  const preview = `🧪 *זו הודעת בדיקה* — כך תיראה ההודעה לאורח (ערוץ: ${channel})\n\n${message}`

  const result = await sendWhatsAppMessage({
    to: normalizePhoneNumber(session.user.phoneNumber),
    message: preview,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'שליחת ההודעה נכשלה' }, { status: 502 })
  }

  return NextResponse.json({ success: true, channel, message })
}
