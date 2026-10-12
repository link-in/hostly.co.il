import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { sendPushNotification } from '@/lib/push/send'
import { canRunPushQaTest } from '@/lib/push/qaTest'

/**
 * Admin-only QA endpoint used by the `?test_push=1` flow (see PushNotificationPrompt).
 *
 * Sends a push notification with the exact same shape as a real "new booking
 * request" owner alert (see src/lib/notifications/bookingAlerts.ts), so admins
 * can verify end-to-end push delivery on their own phone against production
 * without waiting for (or faking) a real Beds24 webhook.
 *
 * Safe to call even when the device has no active subscription yet —
 * sendPushNotification() just reports `sent: 0` in that case.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canRunPushQaTest(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await sendPushNotification(session.user.id, {
      title: 'בקשת הזמנה חדשה 🛎️',
      body: 'אורח בדיקה - יחידה שלך (זוהי הודעת בדיקה)',
      url: '/dashboard/reservations',
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Error sending QA test booking push:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
