import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

export const dynamic = 'force-dynamic'

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'

const getBaseUrl = () => process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL

const normalizeBooleanParam = (value: string | undefined) => {
  if (!value) {
    return undefined
  }
  const normalized = value.toLowerCase()
  if (normalized === 'true') {
    return '1'
  }
  if (normalized === 'false') {
    return '0'
  }
  return value
}

const buildDefaultRange = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 3) // Get 3 months ahead instead of 1
  const toDateString = (value: Date) => value.toISOString().slice(0, 10)
  return {
    startDate: toDateString(start),
    endDate: toDateString(end),
  }
}

const getString = (value: unknown, keys: string[]) => {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  for (const key of keys) {
    const candidate = (value as Record<string, unknown>)[key]
    if (typeof candidate === 'string') {
      return candidate
    }
    if (typeof candidate === 'number') {
      return String(candidate)
    }
  }
  return undefined
}

const getNumber = (value: unknown, keys: string[]) => {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  for (const key of keys) {
    const candidate = (value as Record<string, unknown>)[key]
    if (typeof candidate === 'number') {
      return candidate
    }
    if (typeof candidate === 'string') {
      const parsed = Number.parseFloat(candidate)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }
  }
  return undefined
}

const normalizeDate = (value: Date) => {
  const normalized = new Date(value)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (value: Date, days: number) => {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

const extractRowPrice = (row: unknown) => {
  const direct = getNumber(row, ['price', 'price1', 'rate', 'amount', 'basePrice'])
  if (direct !== undefined) {
    return direct
  }

  if (!row || typeof row !== 'object') {
    return undefined
  }

  const prices = (row as Record<string, unknown>).prices
  const priceKeys = ['price', 'price1', 'rate', 'amount', 'basePrice']

  if (prices && typeof prices === 'object') {
    const fromObject = getNumber(prices, priceKeys)
    if (fromObject !== undefined) {
      return fromObject
    }
  }

  if (Array.isArray(prices)) {
    for (const entry of prices) {
      const fromEntry = getNumber(entry, priceKeys)
      if (fromEntry !== undefined) {
        return fromEntry
      }
    }
  }

  return undefined
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  // Allow client to override roomId via query param (multi-room support)
  const requestUrl = new URL(request.url)
  const roomIdOverride = requestUrl.searchParams.get('roomId')
  const roomIdRaw = roomIdOverride ?? session?.user?.roomId ?? process.env.BEDS24_ROOM_ID
  const roomId = roomIdRaw?.split(',')[0].split(':')[0].trim()
  const includeAvailability = process.env.BEDS24_INCLUDE_AVAILABILITY

  if (!propertyId) {
    return NextResponse.json({ error: 'Missing BEDS24_PROPERTY_ID' }, { status: 500 })
  }

  const { startDate, endDate } = buildDefaultRange()
  const queryStartDate = process.env.BEDS24_INVENTORY_START_DATE ?? startDate
  const queryEndDate = process.env.BEDS24_INVENTORY_END_DATE ?? endDate

  const url = new URL(`${getBaseUrl()}/inventory/rooms/calendar`)
  const queryOverride = process.env.BEDS24_INVENTORY_QUERY
  if (queryOverride) {
    const params = new URLSearchParams(queryOverride)
    params.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  } else {
    url.searchParams.set('propertyId', propertyId)
    url.searchParams.set('startDate', queryStartDate)
    url.searchParams.set('endDate', queryEndDate)
    url.searchParams.set('includePrices', normalizeBooleanParam('true') ?? '1')
    if (roomId) {
      url.searchParams.set('roomId', roomId)
    }
    if (includeAvailability) {
      url.searchParams.set('includeAvailability', normalizeBooleanParam(includeAvailability) ?? includeAvailability)
    }
  }

  // Prepare user-specific tokens if available
  const userTokens = session?.user?.beds24Token && session?.user?.beds24RefreshToken
    ? {
        accessToken: session.user.beds24Token,
        refreshToken: session.user.beds24RefreshToken,
      }
    : undefined

  // Also fetch room base price from /inventory/rooms (fallback when calendar has no overrides)
  // Note: /inventory/rooms does not support roomId filter — fetch all and filter in code
  const roomsInfoUrl = new URL(`${getBaseUrl()}/inventory/rooms`)
  roomsInfoUrl.searchParams.set('propertyId', propertyId)

  // Fallback URL: try without propertyId when a specific roomId is given
  // (room may belong to a different property than the user's default)
  const fallbackUrl = roomId ? new URL(`${getBaseUrl()}/inventory/rooms/calendar`) : null
  if (fallbackUrl) {
    fallbackUrl.searchParams.set('roomId', roomId!)
    fallbackUrl.searchParams.set('startDate', queryStartDate)
    fallbackUrl.searchParams.set('endDate', queryEndDate)
    fallbackUrl.searchParams.set('includePrices', '1')
  }

  try {
    const [response, roomsInfoRes] = await Promise.all([
      fetchWithTokenRefresh(url.toString(), {
        headers: { 'content-type': 'application/json' },
      }, userTokens, session?.user?.id),
      fetchWithTokenRefresh(roomsInfoUrl.toString(), {}, userTokens, session?.user?.id),
    ])

    if (!response.ok) {
      const details = await response.text()
      return NextResponse.json(
        { error: 'Beds24 request failed', status: response.status, details, requestUrl: url.toString() },
        { status: 502 }
      )
    }

    let data = await response.json()

    // If primary query returned empty and we have a fallback, retry without propertyId
    const primaryEmpty = Array.isArray(data?.data) ? data.data.length === 0 : !data?.data
    if (primaryEmpty && fallbackUrl) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[rooms GET] primary empty, retrying without propertyId:', fallbackUrl.toString())
      }
      const fallbackRes = await fetchWithTokenRefresh(fallbackUrl.toString(), {
        headers: { 'content-type': 'application/json' },
      }, userTokens, session?.user?.id)
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json()
        const fallbackHasData = Array.isArray(fallbackData?.data) ? fallbackData.data.length > 0 : !!fallbackData?.data
        if (fallbackHasData) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[rooms GET] fallback returned data:', JSON.stringify(fallbackData).slice(0, 500))
          }
          data = fallbackData
        }
      }
    }
    let roomsInfoData = null
    if (roomsInfoRes.ok) {
      roomsInfoData = await roomsInfoRes.json()
    } else if (process.env.NODE_ENV !== 'production') {
      const errText = await roomsInfoRes.text()
      console.log('[rooms GET] roomsInfo FAILED:', roomsInfoRes.status, errText.slice(0, 300))
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[rooms GET] Beds24 URL:', url.toString())
      console.log('[rooms GET] raw Beds24 response (first 1000 chars):', JSON.stringify(data).slice(0, 1000))
      console.log('[rooms GET] roomsInfo response (first 1000 chars):', JSON.stringify(roomsInfoData).slice(0, 1000))
    }

    // Extract base price from room settings as fallback
    const roomsInfoList = Array.isArray(roomsInfoData?.data) ? roomsInfoData.data : []
    const matchingRoom = roomsInfoList.find((r: Record<string, unknown>) =>
      String(r.id ?? r.roomId) === String(roomId)
    )
    const basePrice: number | undefined =
      getNumber(matchingRoom, ['price', 'price1', 'basePrice', 'roomPrice', 'defaultPrice']) ??
      getNumber(matchingRoom?.prices, ['price', 'price1', 'basePrice']) ??
      undefined

    if (process.env.NODE_ENV !== 'production' && basePrice !== undefined) {
      console.log('[rooms GET] base price from room settings:', basePrice)
    }

    const rooms = Array.isArray(data?.data) ? data.data : []
  const calendarOnly = !rooms.length && data?.calendar ? [{ calendar: data.calendar }] : []
  const sourceRooms = rooms.length ? rooms : calendarOnly
  const prices = sourceRooms.flatMap((room: unknown) => {
    const roomId = getString(room, ['roomId', 'id'])
    const calendars = Array.isArray((room as Record<string, unknown>)?.calendar)
      ? ((room as Record<string, unknown>).calendar as unknown[])
      : []

    return calendars.flatMap((calendar: unknown) => {
      const calendarId = getString(calendar, ['calendarId', 'id', 'roomId'])
      const rows = Array.isArray((calendar as Record<string, unknown>)?.rows)
        ? ((calendar as Record<string, unknown>).rows as unknown[])
        : []

      // Case 1: calendar item contains a rows[] array
      if (rows.length) {
        return rows.flatMap((row: unknown) => {
          const date = getString(row, ['date', 'day', 'startDate'])
          const price = extractRowPrice(row)
          const numAvail = getNumber(row, ['numAvail', 'avail', 'available', 'availability', 'units'])

          if (!date || price === undefined) {
            return []
          }

          return [
            {
              date,
              price,
              roomId: roomId ?? calendarId ?? null,
              numAvail: numAvail !== undefined ? numAvail : 1,
            },
          ]
        })
      }

      // Case 2: calendar item is itself a single-day entry (date field directly on the object)
      const directDate = getString(calendar, ['date', 'day'])
      if (directDate) {
        const price = extractRowPrice(calendar)
        const numAvail = getNumber(calendar, ['numAvail', 'avail', 'available', 'availability', 'units'])
        if (price === undefined) return []
        return [
          {
            date: directDate,
            price,
            roomId: roomId ?? calendarId ?? null,
            numAvail: numAvail !== undefined ? numAvail : 1,
          },
        ]
      }

      // Case 3: calendar item is a date range (from / to)
      const from = getString(calendar, ['from', 'startDate'])
      const to = getString(calendar, ['to', 'endDate'])
      const price = extractRowPrice(calendar)
      const numAvail = getNumber(calendar, ['numAvail', 'avail', 'available', 'availability', 'units'])

      if (!from || !to || price === undefined) {
        return []
      }

      const start = normalizeDate(new Date(from))
      const end = normalizeDate(new Date(to))

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return []
      }

      const entries: { date: string; price: number; roomId: string | null; numAvail: number }[] = []
      let cursor = start
      while (cursor <= end) {
        entries.push({
          date: formatLocalDate(cursor),
          price,
          roomId: roomId ?? calendarId ?? null,
          numAvail: numAvail !== undefined ? numAvail : 1,
        })
        cursor = addDays(cursor, 1)
      }

      return entries
    })
  })

    // If no calendar overrides exist but we have a base price, fill the date range with it
    if (!prices.length && basePrice !== undefined && roomId) {
      const start = normalizeDate(new Date(queryStartDate))
      const end = normalizeDate(new Date(queryEndDate))
      const filled: typeof prices = []
      let cursor = start
      while (cursor <= end) {
        filled.push({
          date: formatLocalDate(cursor),
          price: basePrice,
          roomId,
          numAvail: 1,
        })
        cursor = addDays(cursor, 1)
      }
      return NextResponse.json({ prices: filled, raw: data, basePriceUsed: true })
    }

    return NextResponse.json({ prices, raw: data })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to reach Beds24',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  const defaultRoomId = session?.user?.roomId?.split(',')[0].split(':')[0].trim() ?? process.env.BEDS24_ROOM_ID

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const url = new URL(`${getBaseUrl()}/inventory/rooms/calendar`)
  if (propertyId) {
    url.searchParams.set('propertyId', propertyId)
  }

  const normalizedPayload = Array.isArray(payload)
    ? payload.map((item) => ({
        ...item,
        propertyId: propertyId ? Number(propertyId) : (item as { propertyId?: number }).propertyId,
        roomId: (item as { roomId?: number }).roomId ?? (defaultRoomId ? Number(defaultRoomId) : undefined),
      }))
    : {
        ...(payload as Record<string, unknown>),
        propertyId: propertyId ? Number(propertyId) : (payload as { propertyId?: number }).propertyId,
        roomId: (payload as { roomId?: number }).roomId ?? (defaultRoomId ? Number(defaultRoomId) : undefined),
      }

  console.log('[rooms POST] sending to Beds24 URL:', url.toString())
  console.log('[rooms POST] payload:', JSON.stringify(normalizedPayload))

  // Prepare user-specific tokens if available
  const userTokens = session?.user?.beds24Token && session?.user?.beds24RefreshToken
    ? {
        accessToken: session.user.beds24Token,
        refreshToken: session.user.beds24RefreshToken,
      }
    : undefined

  try {
    const response = await fetchWithTokenRefresh(url.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(normalizedPayload),
    }, userTokens, session?.user?.id)

    if (!response.ok) {
      const details = await response.text()
      return NextResponse.json(
        { error: 'Beds24 request failed', status: response.status, details, requestUrl: url.toString() },
        { status: 502 }
      )
    }

    const data = await response.json()
    if (process.env.NODE_ENV !== 'production') {
      console.log('[rooms POST] Beds24 response:', JSON.stringify(data))
      return NextResponse.json({ data, debugPayload: normalizedPayload, requestUrl: url.toString() })
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to reach Beds24',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}
