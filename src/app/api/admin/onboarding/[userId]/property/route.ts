/**
 * GET  /api/admin/onboarding/[userId]/property
 * Lists the properties and rooms in the Beds24 account the client's tokens resolve to.
 *
 * POST /api/admin/onboarding/[userId]/property
 * Creates the Beds24 property with one room (mode "create"), imports an Airbnb listing (mode "importAirbnb"),
 * or links a property that already exists in the client's Beds24 account (mode "existing").
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler, parseJsonBody } from '@/lib/onboarding/http'
import { propertyStepInputSchema } from '@/lib/onboarding/schemas'
import { getAccountPropertiesForClient, runPropertyStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const GET = adminOnboardingHandler(async (_request, userId) =>
  NextResponse.json({ properties: await getAccountPropertiesForClient(userId) }),
)

export const POST = adminOnboardingHandler(async (request, userId) => {
  const parsed = await parseJsonBody(request, propertyStepInputSchema)
  if ('response' in parsed) return parsed.response
  return NextResponse.json(await runPropertyStep(userId, parsed.data))
})
