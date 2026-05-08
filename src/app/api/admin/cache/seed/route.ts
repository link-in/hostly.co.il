/**
 * POST /api/admin/cache/seed
 *
 * Admin-only endpoint to manually seed the availability cache for any user+room.
 * Useful for first-time setup and Postman testing.
 *
 * Auth: requires admin session OR x-admin-secret header (for Postman / CI).
 *
 * Body: { userId: string; propertyId: string; roomId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { refreshRoomCache } from '@/lib/availability/cache'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  userId: z.string().min(1),
  propertyId: z.string().min(1),
  roomId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  // Auth: admin session OR secret header
  const adminSecret = process.env.ADMIN_CACHE_SECRET
  const headerSecret = request.headers.get('x-admin-secret')

  const session = await getServerSession(authOptions)
  const isAdminSession = session?.user?.role === 'admin'
  const isSecretAuth = adminSecret && headerSecret === adminSecret

  if (!isAdminSession && !isSecretAuth) {
    return NextResponse.json({
      error: 'Unauthorized',
      debug: {
        secretSet: !!adminSecret,
        headerReceived: !!headerSecret,
        match: headerSecret === adminSecret,
        secretLength: adminSecret?.length,
        headerLength: headerSecret?.length,
      }
    }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { userId, propertyId, roomId } = parsed.data

  const accessToken = process.env.BEDS24_TOKEN
  const refreshToken = process.env.BEDS24_REFRESH_TOKEN

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: 'BEDS24_TOKEN / BEDS24_REFRESH_TOKEN not set in environment' },
      { status: 500 },
    )
  }

  console.log(`[CacheSeed] Seeding cache for user=${userId} property=${propertyId} room=${roomId}`)

  const result = await refreshRoomCache(userId, propertyId, roomId, accessToken, refreshToken)

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 })
  }

  return NextResponse.json({
    success: true,
    upserted: result.upserted,
    userId,
    propertyId,
    roomId,
    message: `Cache seeded — ${result.upserted} days written.`,
  })
}
