import { NextResponse } from 'next/server'
import { getUsersWithBeds24Access } from '@/lib/db/users'
import { processReviewRemindersForUser } from '@/lib/reviewReminders/service'
import { getYesterdayInIsrael } from '@/lib/reviewReminders/dateUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Verifies the request came from Vercel Cron (or an authorized manual trigger).
 * Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` for scheduled
 * invocations when the `CRON_SECRET` env var is set on the project.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Fail closed — refuse to run an unauthenticated messaging job in any environment.
    console.error('[ReviewReminders] CRON_SECRET is not configured — refusing to run')
    return false
  }
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

/**
 * Daily cron entry point (scheduled ~10:00 Israel time — see vercel.json).
 * Sends the post-checkout review-request WhatsApp message to every guest who
 * checked out "yesterday" (Israel calendar day), across every host.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dateStr = getYesterdayInIsrael()
  const users = await getUsersWithBeds24Access()

  let totalBookingsFound = 0
  let totalSent = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (const user of users) {
    try {
      const summary = await processReviewRemindersForUser(user, dateStr)
      totalBookingsFound += summary.bookingsFound
      totalSent += summary.sent
      totalSkipped += summary.skipped
      totalFailed += summary.failed
    } catch (err) {
      console.error(`[ReviewReminders] Unexpected error processing user ${user.id}:`, err)
      totalFailed++
    }
  }

  console.log(
    `[ReviewReminders] ${dateStr}: ${users.length} hosts, ${totalBookingsFound} checkouts, ${totalSent} sent, ${totalSkipped} skipped, ${totalFailed} failed`,
  )

  return NextResponse.json({
    date: dateStr,
    usersProcessed: users.length,
    totalBookingsFound,
    totalSent,
    totalSkipped,
    totalFailed,
  })
}
