import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { z } from 'zod'

const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

const importSchema = z.object({
  action: z.literal('importAsNewProperty'),
  airbnbUserId: z.string().min(1),
  airbnbListingId: z.string().min(1),
})

const connectSchema = z.object({
  action: z.literal('connectToExistingRoom'),
  airbnbUserId: z.string().min(1),
  airbnbListingId: z.string().min(1),
  roomId: z.string().min(1),
})

const bodySchema = z.discriminatedUnion('action', [importSchema, connectSchema])

/**
 * POST /api/dashboard/beds24/airbnb-connect
 *
 * Two modes:
 *  - action: "importAsNewProperty" → Beds24 auto-creates Property + Room from Airbnb listing.
 *    Returns { success, propertyId, roomId }
 *  - action: "connectToExistingRoom" → Connects listing to a pre-existing room.
 *    Returns { success }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'פרמטרים חסרים', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { action, airbnbUserId, airbnbListingId } = parsed.data

  const payload =
    action === 'importAsNewProperty'
      ? [{ action, airbnbUserId, airbnbListingId, connect: 'full' }]
      : [{ action, airbnbUserId, airbnbListingId, connect: 'full', roomId: Number(parsed.data.roomId) }]

  try {
    const res = await fetchWithTokenRefresh(`${BASE_URL}/channels/airbnb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const rawText = await res.text()
    let data: unknown
    try { data = JSON.parse(rawText) } catch { data = rawText }

    console.log(`[Beds24] POST /channels/airbnb (${action}) → ${res.status}:`, JSON.stringify(data).slice(0, 500))

    if (!res.ok) {
      const beds24Error = (data as { error?: string })?.error ?? JSON.stringify(data)
      return NextResponse.json(
        { error: `שגיאה מ-Beds24: ${beds24Error}`, details: data },
        { status: 502 }
      )
    }

    const result = Array.isArray(data) ? (data as Record<string, unknown>[])[0] : data as Record<string, unknown>
    const success = (result as { success?: boolean })?.success !== false

    if (!success) {
      const errors = (result as { errors?: unknown[] })?.errors ?? []
      return NextResponse.json({ error: 'הפעולה נכשלה', details: errors }, { status: 502 })
    }

    if (action === 'importAsNewProperty') {
      // Extract the new propertyId and roomId created by Beds24 from the Airbnb listing
      const newData = (result as { new?: Record<string, unknown> })?.new ?? {}
      const propertyId = String(newData.id ?? '')
      const rooms = (newData.roomTypes as Array<{ id: unknown }>) ?? []
      const roomId = String(rooms[0]?.id ?? '')

      return NextResponse.json({ success: true, propertyId, roomId })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Beds24] airbnb-connect error:', err)
    return NextResponse.json(
      { error: 'שגיאה פנימית', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
