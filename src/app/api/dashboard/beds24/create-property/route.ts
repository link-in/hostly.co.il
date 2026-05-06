import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

/**
 * POST /api/dashboard/beds24/create-property
 * Creates a new property + default room in Beds24 under the master account.
 * Accessible by any authenticated user (used during onboarding).
 * Returns: { propertyId, roomId, name }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'יש להתחבר תחילה' }, { status: 401 })
  }

  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'שם הנכס הוא שדה חובה' }, { status: 400 })
  }

  try {
    // Step 1: Create the property
    const propRes = await fetchWithTokenRefresh(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ name: name.trim() }]),
    })

    const propText = await propRes.text()
    let propData: unknown
    try { propData = JSON.parse(propText) } catch { propData = propText }

    console.log(`[Beds24] POST /properties → ${propRes.status}:`, JSON.stringify(propData).slice(0, 300))

    if (!propRes.ok) {
      return NextResponse.json({ error: 'Beds24 לא הצליחה ליצור נכס', details: propData }, { status: 502 })
    }

    const propResult = Array.isArray(propData) ? (propData as Record<string, unknown>[])[0] : null
    const propertyId = (propResult?.new as Record<string, unknown>)?.id ?? null

    if (!propertyId) {
      return NextResponse.json({ error: 'הנכס נוצר אבל לא חזר מזהה — בדוק ב-Beds24', details: propData }, { status: 502 })
    }

    // Step 2: Create a default room under the new property
    const roomRes = await fetchWithTokenRefresh(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        id: propertyId,
        roomTypes: [{ name: name.trim() }],
      }]),
    })

    const roomText = await roomRes.text()
    let roomData: unknown
    try { roomData = JSON.parse(roomText) } catch { roomData = roomText }

    console.log(`[Beds24] POST /properties (room) → ${roomRes.status}:`, JSON.stringify(roomData).slice(0, 300))

    let roomId: string | null = null
    if (roomRes.ok) {
      const roomResult = Array.isArray(roomData) ? (roomData as Record<string, unknown>[])[0] : null
      const newRooms = ((roomResult?.new as Record<string, unknown>)?.roomTypes as Record<string, unknown>[]) ?? []
      roomId = String(newRooms[0]?.id ?? '') || null
    }

    return NextResponse.json({
      success: true,
      propertyId: String(propertyId),
      roomId: roomId ?? null,
      name: name.trim(),
    })
  } catch (err) {
    console.error('[Beds24] create-property error:', err)
    return NextResponse.json({ error: 'שגיאה פנימית', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
