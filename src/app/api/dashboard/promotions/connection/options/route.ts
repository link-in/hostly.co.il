import { NextResponse } from 'next/server'
import { demoForbidden, getHostSession, unauthorized } from '@/lib/promotions/api/http'
import { loadMetaAssetOptions } from '@/lib/promotions/publishing/meta/connectionService'
import { MetaApiError } from '@/lib/promotions/publishing/meta/graphClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Ad accounts and pages the connected Meta user can publish with. */
export async function GET() {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  try {
    const options = await loadMetaAssetOptions(session.userId)
    if (!options) return NextResponse.json({ error: 'אין חיבור ל-Meta' }, { status: 404 })
    return NextResponse.json(options)
  } catch (err) {
    console.error('[Promotions] load Meta assets:', err)
    const message = err instanceof MetaApiError ? err.message : 'טעינת החשבונות מ-Meta נכשלה'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
