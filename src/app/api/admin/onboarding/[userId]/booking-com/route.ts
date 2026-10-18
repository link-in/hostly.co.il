/**
 * POST /api/admin/onboarding/[userId]/booking-com
 * Records that the manual Booking.com connection checklist was completed.
 */
import { NextResponse } from 'next/server'
import { adminOnboardingHandler, parseJsonBody } from '@/lib/onboarding/http'
import { bookingComStepInputSchema } from '@/lib/onboarding/schemas'
import { runBookingComStep } from '@/lib/onboarding/service'

export const dynamic = 'force-dynamic'

export const POST = adminOnboardingHandler(async (request, userId) => {
  const parsed = await parseJsonBody(request, bookingComStepInputSchema)
  if ('response' in parsed) return parsed.response
  return NextResponse.json(await runBookingComStep(userId, parsed.data))
})
