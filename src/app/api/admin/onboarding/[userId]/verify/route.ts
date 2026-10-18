/**
 * POST /api/admin/onboarding/[userId]/verify
 * Reads back the Airbnb mapping and multiplier, plus the account-wide channel link counts.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler } from '@/lib/onboarding/http'
import { runVerifyChannelsStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const POST = adminOnboardingHandler(async (_request, userId) =>
  NextResponse.json(await runVerifyChannelsStep(userId)),
)
