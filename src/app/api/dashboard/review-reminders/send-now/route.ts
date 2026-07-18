import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { processReviewRemindersForUser } from '@/lib/reviewReminders/service'
import { getYesterdayInIsrael } from '@/lib/reviewReminders/dateUtils'
import type { UserWithBeds24Access } from '@/lib/db/users'

/**
 * POST /api/dashboard/review-reminders/send-now
 * Manually re-runs the real post-checkout review-reminder logic for the
 * logged-in host's own account (bypassing the cron schedule). Safe to click
 * repeatedly — bookings already logged in `review_reminders_log` are skipped.
 * Optional JSON body: { date?: 'YYYY-MM-DD' } — defaults to "yesterday" (Israel time).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.isDemo) {
    return NextResponse.json(
      { error: 'מצב דמו: לא ניתן לשלוח הודעות אמיתיות' },
      { status: 403 },
    )
  }

  if (!session.user.propertyId || !session.user.beds24Token) {
    return NextResponse.json(
      { error: 'חשבון Beds24 לא מחובר — לא ניתן לשלוף הזמנות' },
      { status: 400 },
    )
  }

  let payload: { date?: string } = {}
  try {
    payload = await request.json()
  } catch {
    // Body is optional — default to "yesterday" below.
  }

  const dateStr = payload.date && /^\d{4}-\d{2}-\d{2}$/.test(payload.date)
    ? payload.date
    : getYesterdayInIsrael()

  const user: UserWithBeds24Access = {
    id: session.user.id,
    propertyId: session.user.propertyId,
    displayName: session.user.displayName || null,
    googleReviewUrl: session.user.googleReviewUrl || null,
    beds24Token: session.user.beds24Token,
    beds24RefreshToken: session.user.beds24RefreshToken || '',
  }

  const summary = await processReviewRemindersForUser(user, dateStr)

  return NextResponse.json({ success: true, date: dateStr, ...summary })
}
