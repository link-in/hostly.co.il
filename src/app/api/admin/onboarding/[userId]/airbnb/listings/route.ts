/**
 * GET /api/admin/onboarding/[userId]/airbnb/listings?airbnbUserId=
 * Lists the listings of one authorized Airbnb account.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler } from '@/lib/onboarding/http'
import { airbnbListingsQuerySchema } from '@/lib/onboarding/schemas'
import { getAirbnbListingsForClient } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const GET = adminOnboardingHandler(async (request, userId) => {
  const query = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = airbnbListingsQuerySchema.safeParse(query)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  return NextResponse.json({
    listings: await getAirbnbListingsForClient(userId, parsed.data.airbnbUserId),
  })
})
