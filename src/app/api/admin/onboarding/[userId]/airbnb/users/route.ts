/**
 * GET /api/admin/onboarding/[userId]/airbnb/users
 * Lists Airbnb accounts already authorized on the Beds24 account.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler } from '@/lib/onboarding/http'
import { getAirbnbUsersForClient } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const GET = adminOnboardingHandler(async (_request, userId) =>
  NextResponse.json({ users: await getAirbnbUsersForClient(userId) }),
)
