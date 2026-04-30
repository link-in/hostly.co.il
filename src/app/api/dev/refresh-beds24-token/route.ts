import { NextResponse } from 'next/server'
import { Beds24TokenManager } from '@/lib/beds24/tokenManager'

/**
 * Dev endpoint: exchange a Beds24 invite code for fresh tokens.
 * Only available in development mode.
 *
 * Usage:
 *   GET /api/dev/refresh-beds24-token?code=YOUR_INVITE_CODE
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.json(
      { error: 'Missing ?code= parameter. Pass your Beds24 invite code.' },
      { status: 400 }
    )
  }

  try {
    const result = await Beds24TokenManager.setupFromInviteCode(code)
    return NextResponse.json({
      ok: true,
      message: 'Tokens generated. Copy these into your .env.local and restart the server.',
      BEDS24_TOKEN: result.accessToken,
      BEDS24_REFRESH_TOKEN: result.refreshToken,
      expiresIn: result.expiresIn,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Failed to setup tokens', message }, { status: 500 })
  }
}
