import { NextResponse } from 'next/server'
import { getHostSession, serverError, unauthorized } from '@/lib/promotions/api/http'
import { listCampaigns } from '@/lib/promotions/campaigns/repository'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return NextResponse.json({ campaigns: [] })

  try {
    return NextResponse.json({ campaigns: await listCampaigns(session.userId) })
  } catch (err) {
    return serverError('list campaigns', err)
  }
}
