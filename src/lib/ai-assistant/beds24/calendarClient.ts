/**
 * Server-only Beds24 v2 calendar access for the AI assistant.
 *
 * Tokens are resolved inside `fetchWithTokenRefresh` from `users` by `userId`
 * (the DB is the source of truth), so callers never handle Beds24 secrets.
 * Every function returns a `Beds24Result` instead of throwing, so tools can
 * explain failures to the user rather than crash the conversation.
 */
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { detectAndMarkCreditError, isBeds24CreditError } from '@/lib/beds24/creditGuard'
import { describeBeds24Failure, hasBeds24Failure } from '@/lib/beds24/responseFailure'
import { buildBlockDatesPayload, buildPriceUpdatePayload, type CalendarPostItem } from './calendarPayloads'
import { parseAvailabilityResponse, parseCalendarPricesResponse } from './calendarParsers'
import { nightRangeSchema, type AvailabilityByDate, type Beds24Error, type Beds24Result, type NightRange, type PriceByDate, type RoomTarget } from './types'

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

function fail(kind: Beds24Error['kind'], message: string, status?: number): { ok: false; error: Beds24Error } {
  return { ok: false, error: { kind, message, status } }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json()
  } catch {
    return undefined
  }
}

async function send(url: string, init: RequestInit, userId: string): Promise<Beds24Result<unknown>> {
  let response: Response
  try {
    response = await fetchWithTokenRefresh(url, init, undefined, userId)
  } catch (err) {
    return fail('network', err instanceof Error ? err.message : String(err))
  }

  const body = await readJson(response)

  if (!response.ok || hasBeds24Failure(body)) {
    await detectAndMarkCreditError(response, userId)
    if (isBeds24CreditError(response.status, body)) {
      return fail('credit', describeBeds24Failure(body, 'Beds24 account is out of credits'), response.status)
    }
    return response.ok
      ? fail('rejected', describeBeds24Failure(body), response.status)
      : fail('http', describeBeds24Failure(body, `Beds24 HTTP ${response.status}`), response.status)
  }

  if (body === undefined) return fail('invalid_response', 'Beds24 returned a non-JSON response', response.status)
  return { ok: true, data: body }
}

function invalidRange(range: NightRange): { ok: false; error: Beds24Error } | null {
  const parsed = nightRangeSchema.safeParse(range)
  return parsed.success ? null : fail('invalid_input', parsed.error.issues.map((issue) => issue.message).join('; '))
}

function rangeParams(target: RoomTarget, range: NightRange): Record<string, string> {
  return {
    propertyId: String(target.propertyId),
    roomId: String(target.roomId),
    startDate: range.from,
    endDate: range.to,
  }
}

/** Per-night availability from Beds24's ground-truth endpoint. Does not include the local manual-block cache. */
export async function fetchRoomAvailability(target: RoomTarget, range: NightRange): Promise<Beds24Result<AvailabilityByDate>> {
  const invalid = invalidRange(range)
  if (invalid) return invalid
  const result = await send(buildUrl('/inventory/rooms/availability', rangeParams(target, range)), {}, target.userId)
  if (!result.ok) return result
  const parsed = parseAvailabilityResponse(result.data, target.roomId, range)
  return parsed ? { ok: true, data: parsed } : fail('invalid_response', 'Unrecognised availability response')
}

/** Per-night price overrides. Nights without an override are absent (they use the room's base price). */
export async function fetchRoomPrices(target: RoomTarget, range: NightRange): Promise<Beds24Result<PriceByDate>> {
  const invalid = invalidRange(range)
  if (invalid) return invalid
  const url = buildUrl('/inventory/rooms/calendar', { ...rangeParams(target, range), includePrices: '1' })
  const result = await send(url, {}, target.userId)
  if (!result.ok) return result
  const parsed = parseCalendarPricesResponse(result.data, target.roomId, range)
  return parsed ? { ok: true, data: parsed } : fail('invalid_response', 'Unrecognised calendar response')
}

async function postCalendar(target: RoomTarget, payload: CalendarPostItem[]): Promise<Beds24Result<unknown>> {
  const url = buildUrl('/inventory/rooms/calendar', { propertyId: String(target.propertyId) })
  return send(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }, target.userId)
}

/** Closes the room for the given nights in Beds24. The caller is responsible for updating availability_cache. */
export async function blockRoomDates(target: RoomTarget, range: NightRange): Promise<Beds24Result<CalendarPostItem[]>> {
  const invalid = invalidRange(range)
  if (invalid) return invalid
  const payload = buildBlockDatesPayload(target.propertyId, target.roomId, range)
  const result = await postCalendar(target, payload)
  return result.ok ? { ok: true, data: payload } : result
}

/** Sets the base nightly price for the given nights in Beds24. */
export async function updateRoomPrice(
  target: RoomTarget,
  range: NightRange,
  price: number,
): Promise<Beds24Result<CalendarPostItem[]>> {
  const invalid = invalidRange(range)
  if (invalid) return invalid
  if (!Number.isFinite(price) || price <= 0) return fail('invalid_input', `Invalid price: ${price}`)
  const payload = buildPriceUpdatePayload(target.propertyId, target.roomId, range, price)
  const result = await postCalendar(target, payload)
  return result.ok ? { ok: true, data: payload } : result
}
