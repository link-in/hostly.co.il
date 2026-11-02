/**
 * GET /api/cron/block-sync
 *
 * Makes sure every future date an owner blocked in Hostly is really closed in
 * Beds24 (and therefore on Airbnb / Booking.com). Blocks Beds24 still reports
 * as bookable are re-closed and the owner gets a WhatsApp summary.
 *
 * Scheduled in vercel.json.
 */
import { NextResponse } from 'next/server'
import { listManualBlocks, reconcileRoomBlocks, type ReconcileResult } from '@/lib/availability/reconcile'
import { getDateStringInTimeZone } from '@/lib/reviewReminders/dateUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

const LOOKAHEAD_DAYS = 365

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[BlockSyncCron] CRON_SECRET is not configured — refusing to run')
    return false
  }
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await listManualBlocks(getDateStringInTimeZone(0), getDateStringInTimeZone(LOOKAHEAD_DAYS))
  const results: ReconcileResult[] = []
  // Sequential on purpose: keeps Beds24 API usage spread out.
  for (const group of groups) {
    try {
      results.push(await reconcileRoomBlocks(group))
    } catch (err) {
      console.error(`[BlockSyncCron] room ${group.roomId} (user ${group.userId}) failed:`, err)
      results.push({
        userId: group.userId,
        roomId: group.roomId,
        checked: group.dates.length,
        drifted: [],
        repaired: [],
        stillOpen: [],
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const summary = {
    rooms: groups.length,
    datesChecked: results.reduce((sum, r) => sum + r.checked, 0),
    drifted: results.reduce((sum, r) => sum + r.drifted.length, 0),
    repaired: results.reduce((sum, r) => sum + r.repaired.length, 0),
    stillOpen: results.reduce((sum, r) => sum + r.stillOpen.length, 0),
    failedRooms: results.filter((r) => r.error).length,
  }
  console.log('[BlockSyncCron]', JSON.stringify(summary))
  return NextResponse.json({ ...summary, results })
}
