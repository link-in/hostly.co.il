/**
 * POST /api/admin/onboarding/[userId]/finalize
 * Seeds the availability cache, creates the calendar API key and marks onboarding complete.
 * The API key is returned only on the first successful run.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler } from '@/lib/onboarding/http'
import { runFinalizeStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const POST = adminOnboardingHandler(async (_request, userId) =>
  NextResponse.json(await runFinalizeStep(userId)),
)
