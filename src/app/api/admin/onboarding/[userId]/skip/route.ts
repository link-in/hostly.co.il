/**
 * POST /api/admin/onboarding/[userId]/skip
 * Skips an optional channel step (Airbnb or Booking.com). Skipping Airbnb also skips its multiplier.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminOnboardingHandler, parseJsonBody } from '@/lib/onboarding/http'
import { SKIPPABLE_STEPS } from '@/lib/onboarding/state'
import { skipStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

const skipInputSchema = z.object({ step: z.enum(SKIPPABLE_STEPS) })

export const POST = adminOnboardingHandler(async (request, userId) => {
  const parsed = await parseJsonBody(request, skipInputSchema)
  if ('response' in parsed) return parsed.response
  const state = await skipStep(userId, parsed.data.step)
  return NextResponse.json({ steps: state.steps })
})
