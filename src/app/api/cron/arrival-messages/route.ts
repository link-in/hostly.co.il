import { NextResponse } from 'next/server'
import { getUsersWithBeds24Access } from '@/lib/db/users'
import { processArrivalMessagesForUser } from '@/lib/arrivalMessages/service'
import { getDateStringInTimeZone } from '@/lib/reviewReminders/dateUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[ArrivalMessages] CRON_SECRET is not configured — refusing to run')
    return false
  }
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

/**
 * Daily cron entry point (scheduled 06:00 UTC = 09:00 Israel summer time).
 * Sends the morning-of-arrival WhatsApp message (photo + intro + Waze + house rules)
 * to every guest arriving today, across every host.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dateStr = getDateStringInTimeZone(0) // today in Israel timezone
  const users = await getUsersWithBeds24Access()

  let totalBookingsFound = 0
  let totalSent = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (const user of users) {
    try {
      const summary = await processArrivalMessagesForUser(user, dateStr)
      totalBookingsFound += summary.bookingsFound
      totalSent += summary.sent
      totalSkipped += summary.skipped
      totalFailed += summary.failed
    } catch (err) {
      console.error(`[ArrivalMessages] Unexpected error processing user ${user.id}:`, err)
      totalFailed++
    }
  }

  console.log(
    `[ArrivalMessages] ${dateStr}: ${users.length} hosts, ${totalBookingsFound} arrivals, ${totalSent} sent, ${totalSkipped} skipped, ${totalFailed} failed`,
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
