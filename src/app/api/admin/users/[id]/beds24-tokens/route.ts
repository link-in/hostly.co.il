/**
 * POST /api/admin/users/[id]/beds24-tokens
 *
 * Exchanges a Beds24 invite code for access + refresh tokens and saves them
 * directly to the user row. Combines the two-step process of:
 *   1. POST /api/admin/beds24/exchange-invite  (get tokens)
 *   2. PUT  /api/admin/users/[id]              (save tokens)
 *
 * Body:   { inviteCode: string }
 * Returns: { success: true, expiresIn: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { Beds24TokenManager } from '@/lib/beds24/tokenManager'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  inviteCode: z.string().min(4, 'Invite code is required'),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') return null
  return session
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: userId } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { inviteCode } = parsed.data

  try {
    // Step 1: Exchange invite code for tokens
    const tokens = await Beds24TokenManager.setupFromInviteCode(inviteCode.trim())

    // Step 2: Save tokens directly to the user row (service role bypasses RLS)
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('users')
      .update({
        beds24_token: tokens.accessToken,
        beds24_refresh_token: tokens.refreshToken,
      })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to save tokens: ${error.message}`)
    }

    console.log(`[Beds24Tokens] Tokens saved for user ${userId}, expires in ${tokens.expiresIn}s`)

    return NextResponse.json({
      success: true,
      expiresIn: tokens.expiresIn,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Beds24Tokens] Error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
