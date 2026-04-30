import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { DEMO_ROOMS } from '@/lib/dashboard/providers/mock'

export const dynamic = 'force-dynamic'

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'

/**
 * Parse room_id field which may be:
 *   - a single id:        "638851"
 *   - comma-separated:    "638851,672381"
 *   - id:name pairs:      "638851:נוף הרים בדפנה,672381:חדר שני"
 */
function parseSessionRooms(roomId: string): RoomListItem[] {
  return roomId
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const [id, name] = part.split(':').map((s) => s.trim())
      return {
        id,
        name: name || `חדר ${index + 1}`,
      }
    })
}

const getBaseUrl = () => process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL

export interface RoomListItem {
  id: string
  name: string
}

export async function GET() {
  const session = await getServerSession(authOptions)

  // Demo users get hardcoded mock rooms (no real Beds24 property)
  if (session?.user?.isDemo) {
    return NextResponse.json([...DEMO_ROOMS] satisfies RoomListItem[])
  }

  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID

  if (!propertyId) {
    return NextResponse.json({ error: 'Missing propertyId' }, { status: 500 })
  }

  const userTokens =
    session?.user?.beds24Token && session?.user?.beds24RefreshToken
      ? {
          accessToken: session.user.beds24Token,
          refreshToken: session.user.beds24RefreshToken,
        }
      : undefined

  const url = new URL(`${getBaseUrl()}/inventory/rooms`)
  url.searchParams.set('propertyId', propertyId)

  try {
    const response = await fetchWithTokenRefresh(url.toString(), {}, userTokens, session?.user?.id)

    if (!response.ok) {
      // Fallback: parse comma-separated room IDs from session (e.g. "638851,672381")
      if (session?.user?.roomId) {
        return NextResponse.json(parseSessionRooms(session.user.roomId))
      }
      const details = await response.text()
      return NextResponse.json(
        { error: 'Beds24 request failed', details },
        { status: 502 }
      )
    }

    const data = await response.json()
    console.log('🏠 [room-list] Beds24 raw response:', JSON.stringify(data).slice(0, 500))

    // Beds24 /inventory/rooms returns { data: [...] } or an array directly
    const raw: unknown[] = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
      ? data
      : []

    console.log(`🏠 [room-list] Parsed ${raw.length} rooms:`, raw.map((r: any) => ({ id: r.id ?? r.roomId, name: r.name ?? r.roomName })))

    const rooms: RoomListItem[] = raw
      .map((room) => {
        const r = room as Record<string, unknown>
        return {
          id: String(r.id ?? r.roomId ?? ''),
          name: String(r.name ?? r.roomName ?? `Room ${r.id ?? ''}`),
        }
      })
      .filter((r) => r.id !== '')

    // Fallback: if no rooms returned, parse session room IDs
    if (!rooms.length && session?.user?.roomId) {
      return NextResponse.json(parseSessionRooms(session.user.roomId))
    }

    return NextResponse.json(rooms satisfies RoomListItem[])
  } catch (error) {
    // Fallback to session room IDs on network errors
    if (session?.user?.roomId) {
      return NextResponse.json(parseSessionRooms(session.user.roomId))
    }
    return NextResponse.json(
      {
        error: 'Failed to reach Beds24',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}
