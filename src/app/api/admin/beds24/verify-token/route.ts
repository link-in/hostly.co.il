import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'

const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

/**
 * POST /api/admin/beds24/verify-token
 * Tests a Beds24 access token by calling GET /properties
 * Returns account info if valid.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { accessToken } = await request.json()
  if (!accessToken?.trim()) {
    return NextResponse.json({ error: 'Missing accessToken' }, { status: 400 })
  }

  try {
    const res = await fetch(`${BASE_URL}/properties`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        token: accessToken.trim(),
      },
    })

    if (res.status === 401) {
      return NextResponse.json({ valid: false, error: 'טוקן לא תקין או פג תוקף (401)' }, { status: 200 })
    }

    if (!res.ok) {
      return NextResponse.json({ valid: false, error: `Beds24 החזירה ${res.status}` }, { status: 200 })
    }

    const data = await res.json()
    const properties = Array.isArray(data) ? data : data?.data ?? []

    return NextResponse.json({
      valid: true,
      propertiesCount: properties.length,
      properties: properties.slice(0, 5).map((p: { id?: string; name?: string }) => ({
        id: p.id,
        name: p.name,
      })),
    })
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: err instanceof Error ? err.message : 'שגיאת רשת' },
      { status: 200 }
    )
  }
}
