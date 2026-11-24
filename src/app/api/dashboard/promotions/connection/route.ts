import { NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/onboarding/http'
import { demoForbidden, getHostSession, serverError, unauthorized } from '@/lib/promotions/api/http'
import { metaAssetSelectionSchema } from '@/lib/promotions/publishing/meta/assetSelection'
import {
  disconnectMeta,
  getMetaConnectionSummary,
  selectMetaAssets,
} from '@/lib/promotions/publishing/meta/connectionService'
import { getMetaAppConfig } from '@/lib/promotions/publishing/meta/oauth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return NextResponse.json({ connection: null, configured: false })

  try {
    return NextResponse.json({
      connection: await getMetaConnectionSummary(session.userId),
      configured: getMetaAppConfig() !== null,
    })
  } catch (err) {
    return serverError('load connection', err)
  }
}

/** Choose ad account / page / Instagram and the monthly cap; activates the connection. */
export async function PUT(request: Request) {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  const parsed = await parseJsonBody(request, metaAssetSelectionSchema)
  if ('response' in parsed) return parsed.response

  try {
    const result = await selectMetaAssets(session.userId, parsed.data)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
    return NextResponse.json({ connection: await getMetaConnectionSummary(session.userId) })
  } catch (err) {
    return serverError('select assets', err)
  }
}

export async function DELETE() {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  try {
    await disconnectMeta(session.userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('disconnect', err)
  }
}
