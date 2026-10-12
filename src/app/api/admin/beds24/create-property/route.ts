/**
 * POST /api/admin/beds24/create-property
 * Admin-only: creates a property with one room in the master Beds24 account,
 * without attaching it to a client. Client onboarding uses /api/admin/onboarding/[userId]/property.
 * Returns: { propertyId, roomId, name }
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/authOptions'
import { errorResponse, parseJsonBody } from '@/lib/onboarding/http'
import { PROPERTY_TYPES } from '@/lib/onboarding/schemas'
import { createPropertyWithRoom } from '@/lib/onboarding/steps/property'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  name: z.string().trim().min(2, 'שם הנכס קצר מדי').max(100),
  propertyType: z.enum(PROPERTY_TYPES).default('apartment'),
  maxPeople: z.number().int().min(1).max(30).default(2),
  currency: z.string().trim().length(3).default('ILS'),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin' || !session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await parseJsonBody(request, bodySchema)
  if ('response' in parsed) return parsed.response

  try {
    const ids = await createPropertyWithRoom({ userId: session.user.id, step: 'adminCreateProperty' }, parsed.data)
    return NextResponse.json({ success: true, ...ids, name: parsed.data.name })
  } catch (err) {
    return errorResponse(err)
  }
}
