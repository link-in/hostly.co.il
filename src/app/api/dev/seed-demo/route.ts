import { NextResponse } from 'next/server'
import { ensureDemoUser } from '@/lib/auth/getUsersDb'

/**
 * Seed or fix the demo user (demo@hostly.co.il / demo2026).
 * Allowed only in development or with ?secret=SEED_DEMO_SECRET.
 */
export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV === 'development'
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')
  const expectedSecret = process.env.SEED_DEMO_SECRET

  if (!isDev && (!expectedSecret || secret !== expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await ensureDemoUser()
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Seed failed', message: result.message },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true, message: result.message })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Seed failed', message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
