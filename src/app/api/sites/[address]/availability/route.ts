/**
 * GET /api/sites/{address}/availability
 *
 * Nightly price / availability / min stay for a published wizard site, for the
 * next 12 months. Public (the site is public); exposes nothing beyond what the
 * calendar shows. Under /api so the subdomain proxy leaves it alone.
 */

import { NextResponse } from 'next/server'
import { getRoomAvailability } from '@/lib/landingBuilder/availability/serverAvailability'
import { findPublishedSiteRoom } from '@/lib/landingBuilder/persistence/publishedSiteRepository'
import { validateSiteAddress } from '@/lib/landingBuilder/siteAddress'

export const dynamic = 'force-dynamic'

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }

export async function GET(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  if (validateSiteAddress(address) !== null) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const room = await findPublishedSiteRoom(address).catch((error) => {
    console.error('[site-availability] Site lookup failed:', error)
    return null
  })
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const nights = await getRoomAvailability(room)
  if (!nights) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  return NextResponse.json({ nights }, { headers: CACHE_HEADERS })
}
