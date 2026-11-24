import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron/auth'
import { todayInIsrael } from '@/lib/promotions/domain/dates'
import { createDefaultDeps } from '@/lib/promotions/pipeline/defaultDeps'
import { monitorCampaigns } from '@/lib/promotions/pipeline/monitor'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

/** Stops ads whose dates got booked or started, expires stale drafts and refreshes spend/clicks. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = todayInIsrael()
  const summary = await monitorCampaigns(createDefaultDeps(), today)

  console.log(`[Promotions] monitor ${today}: ${JSON.stringify(summary)}`)
  return NextResponse.json({ date: today, ...summary })
}
