/**
 * POST /api/admin/onboarding/[userId]/airbnb/connect
 * Maps an Airbnb listing to the room created in the property step.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler, parseJsonBody } from '@/lib/onboarding/http'
import { airbnbConnectStepInputSchema } from '@/lib/onboarding/schemas'
import { runAirbnbConnectStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const POST = adminOnboardingHandler(async (request, userId) => {
  const parsed = await parseJsonBody(request, airbnbConnectStepInputSchema)
  if ('response' in parsed) return parsed.response
  return NextResponse.json(await runAirbnbConnectStep(userId, parsed.data))
})
