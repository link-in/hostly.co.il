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

export async function GET() {
  const session = await getServerSession(authOptions)
  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  const roomId = session?.user?.roomId ?? process.env.BEDS24_ROOM_ID
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

  try {
    const response = await fetchWithTokenRefresh(url.toString(), {
      headers: {
        'content-type': 'application/json',
      },
    }, userTokens)

    if (!response.ok) {
      const details = await response.text()
      return NextResponse.json(
        { error: 'Beds24 request failed', status: response.status, details, requestUrl: url.toString() },
        { status: 502 }
      )
    }

    const data = await response.json()

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
              numAvail: numAvail !== undefined ? numAvail : 1, // Only default if truly undefined
            },
          ]
        })
      }

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
          numAvail: numAvail !== undefined ? numAvail : 1, // Only default if truly undefined
        })
        cursor = addDays(cursor, 1)
      }

      return entries
    })
  })

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
  const defaultRoomId = session?.user?.roomId ?? process.env.BEDS24_ROOM_ID

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

  console.log('Beds24 rooms calendar payload', normalizedPayload)

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
    }, userTokens)

    if (!response.ok) {
      const details = await response.text()
      return NextResponse.json(
        { error: 'Beds24 request failed', status: response.status, details, requestUrl: url.toString() },
        { status: 502 }
      )
    }

    const data = await response.json()
    if (process.env.NODE_ENV !== 'production') {
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
