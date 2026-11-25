import { NextResponse } from 'next/server'
import { getHostSession } from '@/lib/promotions/api/http'
import { completeMetaOAuth } from '@/lib/promotions/publishing/meta/connectionService'
import { getMetaAppConfig } from '@/lib/promotions/publishing/meta/oauth'
import { verifySignedState } from '@/lib/security/signedState'

export const dynamic = 'force-dynamic'

const STATE_MAX_AGE_MS = 15 * 60 * 1000

function backToDashboard(request: Request, params: Record<string, string>): NextResponse {
  const url = new URL('/dashboard/promotions', request.url)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  if (params.get('error')) return backToDashboard(request, { meta: 'cancelled' })

  const session = await getHostSession()
  const config = getMetaAppConfig()
  const secret = process.env.NEXTAUTH_SECRET
  const code = params.get('code')
  const state = verifySignedState(params.get('state') ?? '', secret ?? '', STATE_MAX_AGE_MS)

  // The state must have been issued to the same logged-in host that returns here.
  if (!session || session.isDemo || !config || !secret || !code || !state || state.userId !== session.userId) {
    return backToDashboard(request, { meta: 'invalid' })
  }

  try {
    await completeMetaOAuth(session.userId, code, config)
    return backToDashboard(request, { meta: 'connected' })
  } catch (err) {
    console.error('[Promotions] Meta OAuth callback failed:', err)
    return backToDashboard(request, { meta: 'failed' })
  }
}
