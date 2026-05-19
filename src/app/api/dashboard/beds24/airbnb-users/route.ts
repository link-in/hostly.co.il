import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

/**
 * GET /api/dashboard/beds24/airbnb-users
 * Returns all Airbnb user IDs connected to the master Beds24 account.
 * Used after OAuth to detect newly connected Airbnb accounts.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetchWithTokenRefresh(`${BASE_URL}/channels/airbnb/users`)

    const rawText = await res.text()
    let data: unknown
    try { data = JSON.parse(rawText) } catch { data = rawText }

    console.log(`[Beds24] GET /channels/airbnb/users → ${res.status}:`, JSON.stringify(data).slice(0, 300))

    if (!res.ok) {
      return NextResponse.json(
        { error: `Beds24 החזירה שגיאה: ${res.status}`, details: data },
        { status: 502 }
      )
    }

    // Beds24 V2 response shape:
    // { success: true, data: [ { airbnbUser: { airbnbUserId, firstName, ... } }, ... ] }
    const rawItems: unknown[] = Array.isArray(data)
      ? data
      : (data as { data?: unknown[] })?.data ?? []

    // Flatten nested { airbnbUser: {...} } wrapper if present
    const users = rawItems.map((item) => {
      const nested = (item as Record<string, unknown>).airbnbUser
      return nested && typeof nested === 'object' ? nested : item
    })

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[Beds24] airbnb-users error:', err)
    return NextResponse.json(
      { error: 'שגיאה פנימית', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
