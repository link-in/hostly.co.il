import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  getArrivalMessageSettings,
  upsertArrivalMessageSettings,
} from '@/lib/db/arrivalMessages'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getArrivalMessageSettings(session.user.id)
  return NextResponse.json(settings ?? {
    userId: session.user.id,
    enabled: false,
    photoUrl: null,
    photoStoragePath: null,
    introText: null,
    wazeLink: null,
    houseRules: null,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.isDemo) {
    return NextResponse.json({ success: true, demo: true })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  const { error } = await upsertArrivalMessageSettings(session.user.id, {
    ...(typeof b.enabled === 'boolean' && { enabled: b.enabled }),
    ...(b.introText !== undefined && { introText: b.introText as string | null }),
    ...(b.wazeLink !== undefined && { wazeLink: b.wazeLink as string | null }),
    ...(b.houseRules !== undefined && { houseRules: b.houseRules as string | null }),
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  const updated = await getArrivalMessageSettings(session.user.id)
  return NextResponse.json({ success: true, settings: updated })
}
