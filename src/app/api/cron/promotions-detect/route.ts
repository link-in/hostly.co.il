import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron/auth'
import { todayInIsrael } from '@/lib/promotions/domain/dates'
import { checkConnectionHealth } from '@/lib/promotions/pipeline/connectionHealth'
import { createDrafts } from '@/lib/promotions/pipeline/createDrafts'
import { createDefaultDeps } from '@/lib/promotions/pipeline/defaultDeps'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

/**
 * Daily (after block-sync refreshes the availability cache):
 * 1. checks every ad-channel connection, so drafts are only made for working ones;
 * 2. turns free dates into AI-written campaign drafts waiting for host approval.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const deps = createDefaultDeps()
  const today = todayInIsrael()
  const connections = await checkConnectionHealth(deps)
  const drafts = await createDrafts(deps, today)

  console.log(`[Promotions] ${today}: connections ${JSON.stringify(connections)}, drafts ${JSON.stringify(drafts)}`)
  return NextResponse.json({ date: today, connections, drafts })
}
