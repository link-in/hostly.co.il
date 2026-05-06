import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { Beds24TokenManager } from '@/lib/beds24/tokenManager'

/**
 * POST /api/admin/beds24/exchange-invite
 * Exchanges a Beds24 invite code for access + refresh tokens.
 * Returns the tokens so the admin can assign them to the new user.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { inviteCode } = body

  if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.trim().length < 4) {
    return NextResponse.json(
      { error: 'inviteCode is required' },
      { status: 400 }
    )
  }

  try {
    const tokens = await Beds24TokenManager.setupFromInviteCode(inviteCode.trim())

    return NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    })
  } catch (error) {
    console.error('[Beds24] exchange-invite error:', error)
    return NextResponse.json(
      {
        error: 'Failed to exchange invite code',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}
