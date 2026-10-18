/**
 * GET /api/admin/onboarding/[userId]
 * Returns the client's onboarding progress, the Airbnb authorization link and the last known credit snapshot.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler } from '@/lib/onboarding/http'
import { getOnboardingOverview } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const GET = adminOnboardingHandler(async (_request, userId) =>
  NextResponse.json(await getOnboardingOverview(userId)),
)
