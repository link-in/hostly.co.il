/**
 * Beds24 block-sync verification.
 *
 * A block is only real once Beds24 reports the date as unavailable — that is
 * what Beds24 pushes to Airbnb / Booking.com. These helpers read Beds24 back
 * and tell which "blocked" dates are still open there, so callers can refuse
 * to report success (POST), flag the drift (GET) or repair it (cron).
 */
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { BEDS24_BASE_URL } from '@/lib/onboarding/constants'
import { expandDateRangeLocal } from '@/lib/availability/blocking'
import { hasBeds24Failure } from '@/lib/beds24/responseFailure'
export { formatShortDate } from '@/lib/dashboard/unsyncedBlocks'

/** date (YYYY-MM-DD) → true when Beds24 says the date can be booked. */
export type AvailabilityMap = Record<string, boolean>

export interface Beds24OpenState {
  availability: AvailabilityMap
  calendar: AvailabilityMap
}

export interface Beds24RoomRef {
  userId?: string
  roomId: string
  propertyId?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function listItems(data: unknown): Record<string, unknown>[] {
  const root = asRecord(data)
  const items = Array.isArray(root?.data) ? root.data : Array.isArray(data) ? data : []
  return items.map(asRecord).filter((item): item is Record<string, unknown> => item !== null)
}

function belongsToRoom(item: Record<string, unknown>, targetRoomId?: string): boolean {
  const itemRoomId = String(item.roomId ?? item.id ?? '')
  return !targetRoomId || !itemRoomId || itemRoomId === String(targetRoomId)
}

function isBlackout(override: unknown): boolean {
  return String(override ?? '').toLowerCase() === 'blackout'
}

/** Parse Beds24 `GET /inventory/rooms/availability` into a date → available map. */
export function extractAvailabilityMap(data: unknown, targetRoomId?: string): AvailabilityMap {
  const map: AvailabilityMap = {}

  for (const item of listItems(data)) {
    if (!belongsToRoom(item, targetRoomId)) continue

    const availability = asRecord(item.availability)
    if (availability) {
      for (const [date, isAvail] of Object.entries(availability)) {
        if (typeof isAvail === 'boolean') map[date] = isAvail
        else if (typeof isAvail === 'number') map[date] = isAvail > 0
      }
    }

    if (typeof item.date === 'string') {
      map[item.date] = typeof item.available === 'boolean'
        ? item.available
        : typeof item.numAvail === 'number'
        ? item.numAvail > 0
        : true
    }
  }

  return map
}

/**
 * Parse Beds24 `GET /inventory/rooms/calendar` (with includeNumAvail and
 * includeOverrides) into a date → available map. Only dates whose entry
 * carries an explicit `numAvail` or `override` are included.
 */
export function extractCalendarAvailabilityMap(data: unknown, targetRoomId?: string): AvailabilityMap {
  const map: AvailabilityMap = {}

  for (const item of listItems(data)) {
    if (!belongsToRoom(item, targetRoomId)) continue
    const entries = Array.isArray(item.calendar) ? item.calendar : [item]

    for (const raw of entries) {
      const entry = asRecord(raw)
      if (!entry) continue
      const from = typeof entry.from === 'string' ? entry.from : typeof entry.date === 'string' ? entry.date : undefined
      const to = typeof entry.to === 'string' ? entry.to : from
      if (!from || !to) continue

      const hasNumAvail = typeof entry.numAvail === 'number'
      const hasOverride = entry.override !== undefined && entry.override !== null && entry.override !== ''
      if (!hasNumAvail && !hasOverride) continue

      const available = !isBlackout(entry.override) && (!hasNumAvail || (entry.numAvail as number) > 0)
      for (const date of expandDateRangeLocal(from, to)) {
        map[date] = available
      }
    }
  }

  return map
}

/**
 * A blocked date is "still open" only when no Beds24 source reports it as
 * blocked AND at least one source positively reports it as available.
 * Dates with no Beds24 information are not reported (unknown ≠ open).
 */
export function findStillOpenDates(dates: string[], state: Beds24OpenState): string[] {
  return dates.filter((date) => {
    const sources = [state.availability[date], state.calendar[date]]
    if (sources.some((value) => value === false)) return false
    return sources.some((value) => value === true)
  })
}

/**
 * Dates Beds24 positively reports as bookable: the availability endpoint says
 * available and Beds24's own calendar entry (before any cache overlay) is not blocked.
 */
export function bookableInBeds24(
  beds24Prices: { date: string; numAvail: number }[],
  beds24Availability: AvailabilityMap,
): AvailabilityMap {
  const blockedInCalendar = new Set(beds24Prices.filter((entry) => entry.numAvail <= 0).map((entry) => entry.date))
  const bookable: AvailabilityMap = {}
  for (const [date, available] of Object.entries(beds24Availability)) {
    if (available && !blockedInCalendar.has(date)) bookable[date] = true
  }
  return bookable
}

/**
 * Flag entries that Hostly shows as blocked while Beds24 reports them
 * bookable — i.e. the channels (Airbnb, Booking.com) are still selling them.
 */
export function markUnsyncedBlocks<T extends { date: string; numAvail: number }>(
  prices: T[],
  beds24Availability: AvailabilityMap,
): (T & { unsynced?: true })[] {
  return prices.map((entry) =>
    entry.numAvail <= 0 && beds24Availability[entry.date] === true ? { ...entry, unsynced: true as const } : entry,
  )
}

/** Dates the payload asks Beds24 to close, grouped by roomId. */
export function blockedDatesByRoom(payload: unknown, defaultRoomId?: string): Record<string, string[]> {
  const items = Array.isArray(payload) ? payload : [payload]
  const byRoom: Record<string, string[]> = {}

  for (const rawItem of items) {
    const item = asRecord(rawItem)
    if (!item || !Array.isArray(item.calendar)) continue
    const roomId = String(item.roomId ?? defaultRoomId ?? '')
    if (!roomId) continue

    for (const rawEntry of item.calendar) {
      const entry = asRecord(rawEntry)
      if (!entry || typeof entry.from !== 'string') continue
      const blocks = isBlackout(entry.override) || (typeof entry.numAvail === 'number' && entry.numAvail <= 0)
      if (!blocks) continue
      const to = typeof entry.to === 'string' ? entry.to : entry.from
      byRoom[roomId] = [...(byRoom[roomId] ?? []), ...expandDateRangeLocal(entry.from, to)]
    }
  }

  return byRoom
}

/** Beds24 `POST /inventory/rooms/calendar` body that closes the given dates on every channel. */
export function buildBlackoutPayload(roomId: string, dates: string[]) {
  return [
    {
      roomId: Number(roomId),
      calendar: dates.map((date) => ({ from: date, to: date, numAvail: 0, override: 'blackout' })),
    },
  ]
}

function dateSpan(dates: string[]): { from: string; to: string } {
  const sorted = [...dates].sort()
  return { from: sorted[0], to: sorted[sorted.length - 1] }
}

async function fetchJson(url: URL, ref: Beds24RoomRef): Promise<unknown | null> {
  try {
    const response = await fetchWithTokenRefresh(url.toString(), { headers: { 'content-type': 'application/json' } }, undefined, ref.userId)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/** Read the current open/closed state of `dates` from Beds24. Returns null when Beds24 could not be read. */
export async function fetchBeds24OpenState(ref: Beds24RoomRef, dates: string[]): Promise<Beds24OpenState | null> {
  if (!dates.length) return { availability: {}, calendar: {} }
  const { from, to } = dateSpan(dates)

  const availabilityUrl = new URL(`${BEDS24_BASE_URL}/inventory/rooms/availability`)
  const calendarUrl = new URL(`${BEDS24_BASE_URL}/inventory/rooms/calendar`)
  for (const url of [availabilityUrl, calendarUrl]) {
    url.searchParams.set('roomId', ref.roomId)
    if (ref.propertyId) url.searchParams.set('propertyId', ref.propertyId)
    url.searchParams.set('startDate', from)
    url.searchParams.set('endDate', to)
  }
  calendarUrl.searchParams.set('includeNumAvail', '1')
  calendarUrl.searchParams.set('includeOverrides', '1')

  const [availabilityData, calendarData] = await Promise.all([fetchJson(availabilityUrl, ref), fetchJson(calendarUrl, ref)])
  if (availabilityData === null && calendarData === null) return null

  return {
    availability: extractAvailabilityMap(availabilityData, ref.roomId),
    calendar: extractCalendarAvailabilityMap(calendarData, ref.roomId),
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Check that Beds24 actually closed `dates`. Re-reads once after a short
 * delay before giving up. Returns the dates still open, or null when Beds24
 * could not be read (verification unknown — callers must not treat as failure).
 */
export async function verifyDatesBlocked(
  ref: Beds24RoomRef,
  dates: string[],
  retryDelayMs = 1500,
): Promise<string[] | null> {
  const first = await fetchBeds24OpenState(ref, dates)
  if (!first) return null
  const stillOpen = findStillOpenDates(dates, first)
  if (!stillOpen.length) return []

  await wait(retryDelayMs)
  const second = await fetchBeds24OpenState(ref, stillOpen)
  return second ? findStillOpenDates(stillOpen, second) : stillOpen
}

/**
 * Verify every block in a calendar POST payload. Returns only rooms that have
 * dates still open in Beds24; rooms that could not be verified are omitted.
 */
export async function findUnappliedBlocks(
  payload: unknown,
  ctx: { userId?: string; defaultRoomId?: string; propertyId?: string },
  retryDelayMs?: number,
): Promise<Record<string, string[]>> {
  const unapplied: Record<string, string[]> = {}
  for (const [roomId, dates] of Object.entries(blockedDatesByRoom(payload, ctx.defaultRoomId))) {
    const stillOpen = await verifyDatesBlocked({ userId: ctx.userId, roomId, propertyId: ctx.propertyId }, dates, retryDelayMs)
    if (stillOpen?.length) unapplied[roomId] = stillOpen
  }
  return unapplied
}

/** Push a blackout for `dates` to Beds24. Returns true when Beds24 accepted it. */
export async function pushBlackout(ref: Beds24RoomRef, dates: string[]): Promise<boolean> {
  const url = new URL(`${BEDS24_BASE_URL}/inventory/rooms/calendar`)
  if (ref.propertyId) url.searchParams.set('propertyId', ref.propertyId)
  try {
    const response = await fetchWithTokenRefresh(
      url.toString(),
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(buildBlackoutPayload(ref.roomId, dates)) },
      undefined,
      ref.userId,
    )
    if (!response.ok) return false
    const body = await response.json().catch(() => null)
    return !hasBeds24Failure(body)
  } catch {
    return false
  }
}
