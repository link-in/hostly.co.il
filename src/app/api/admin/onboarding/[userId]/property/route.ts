/**
 * POST /api/admin/onboarding/[userId]/property
 * Creates the Beds24 property with one room (mode "create"), or imports an Airbnb listing (mode "importAirbnb").
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler, parseJsonBody } from '@/lib/onboarding/http'
import { propertyStepInputSchema } from '@/lib/onboarding/schemas'
import { runPropertyStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const POST = adminOnboardingHandler(async (request, userId) => {
  const parsed = await parseJsonBody(request, propertyStepInputSchema)
  if ('response' in parsed) return parsed.response
  return NextResponse.json(await runPropertyStep(userId, parsed.data))
})
