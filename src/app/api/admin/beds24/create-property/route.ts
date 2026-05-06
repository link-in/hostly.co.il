import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

/**
 * POST /api/admin/beds24/create-property
 * Creates a new property in Beds24 under the master account.
 * Returns the new propertyId so it can be auto-filled in the user form.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'שם הנכס הוא שדה חובה' }, { status: 400 })
  }

  try {
    const res = await fetchWithTokenRefresh(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ name: name.trim() }]),
    })

    const rawText = await res.text()
    let data: unknown
    try { data = JSON.parse(rawText) } catch { data = rawText }

    console.log(`[Beds24] POST /properties → ${res.status}:`, JSON.stringify(data).slice(0, 300))

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Beds24 לא הצליחה ליצור נכס', details: data },
        { status: 502 }
      )
    }

    const result = Array.isArray(data) ? data[0] : null
    const propertyId = result?.new?.id ?? null

    if (!propertyId) {
      return NextResponse.json(
        { error: 'הנכס נוצר אבל לא חזר מזהה — בדוק ב-Beds24', details: data },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      propertyId: String(propertyId),
      name: name.trim(),
    })
  } catch (err) {
    console.error('[Beds24] create-property error:', err)
    return NextResponse.json(
      { error: 'שגיאה פנימית', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
