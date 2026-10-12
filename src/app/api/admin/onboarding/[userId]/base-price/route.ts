/**
 * POST /api/admin/onboarding/[userId]/base-price
 * Sets the room's flat base price and opens availability. Safe to re-run.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler, parseJsonBody } from '@/lib/onboarding/http'
import { basePriceStepInputSchema } from '@/lib/onboarding/schemas'
import { runBasePriceStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const POST = adminOnboardingHandler(async (request, userId) => {
  const parsed = await parseJsonBody(request, basePriceStepInputSchema)
  if ('response' in parsed) return parsed.response
  return NextResponse.json(await runBasePriceStep(userId, parsed.data))
})
