/**
 * POST /api/admin/onboarding/[userId]/airbnb/multiplier
 * Applies the fixed Airbnb price multiplier to the client's property. Safe to re-run.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler } from '@/lib/onboarding/http'
import { runAirbnbMultiplierStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const POST = adminOnboardingHandler(async (_request, userId) =>
  NextResponse.json(await runAirbnbMultiplierStep(userId)),
)
