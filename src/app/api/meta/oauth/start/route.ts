import { NextResponse } from 'next/server'
import { demoForbidden, getHostSession, unauthorized } from '@/lib/promotions/api/http'
import { buildMetaAuthorizeUrl, getMetaAppConfig } from '@/lib/promotions/publishing/meta/oauth'
import { createSignedState } from '@/lib/security/signedState'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  const config = getMetaAppConfig()
  const secret = process.env.NEXTAUTH_SECRET
  if (!config || !secret) {
    return NextResponse.json({ error: 'החיבור ל-Meta עדיין לא הוגדר במערכת' }, { status: 503 })
  }

  return NextResponse.redirect(buildMetaAuthorizeUrl(config, createSignedState(session.userId, secret)))
}
