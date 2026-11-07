/**
 * GET /api/cron/site-availability
 *
 * Daily re-warm of `availability_cache` for every room behind a published
 * wizard site. Booking webhooks already refresh on bookings; this catches
 * price / min-stay / manual changes made in Beds24, which send no webhook.
 *
 * Scheduled: daily at 02:00 UTC — see vercel.json
 */

import { NextResponse } from 'next/server'
import { refreshSiteRoomCache } from '@/lib/landingBuilder/availability/serverAvailability'
import { listPublishedSiteRooms } from '@/lib/landingBuilder/persistence/publishedSiteRepository'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[SiteAvailabilityCron] CRON_SECRET is not configured — refusing to run')
    return false
  }
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rooms = await listPublishedSiteRooms()
  const results = []
  // Sequential on purpose: keeps Beds24 API usage spread out.
  for (const room of rooms) {
    const result = await refreshSiteRoomCache(room)
    results.push({ roomId: room.roomId, upserted: result.upserted, error: result.error })
  }

  const failed = results.filter((result) => result.error).length
  console.log(`[SiteAvailabilityCron] Refreshed ${rooms.length - failed}/${rooms.length} rooms`)
  return NextResponse.json({ rooms: rooms.length, failed, results })
}
