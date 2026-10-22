import { fetchRoomAvailability, fetchRoomPrices } from '../beds24/calendarClient'
import { nightRangeSchema, type NightRange } from '../beds24/types'
import { applyManualBlocks } from '../availability/manualBlocks'
import { countNights, groupConsecutiveNights, listNights, stayToNightRange } from '../dates'
import type { AssistantContext } from '../context'
import { resolveRooms, type ResolvedRoom } from './propertyScope'
import { beds24Failure, invalidInput, isToolFailure, scopeFailure, type ToolFailure } from './results'
import { MAX_AVAILABILITY_NIGHTS, type CheckAvailabilityInput } from './schemas'

export interface RoomAvailability {
  roomId: number
  roomName: string
  fullyAvailable: boolean
  availableStays: { checkIn: string; checkOut: string }[]
  unavailableNights: string[]
  /** Nightly price set in Beds24; null when the night has no explicit price. */
  nightlyPrices: Record<string, number | null>
}

export interface CheckAvailabilitySuccess {
  ok: true
  propertyId: number
  checkIn: string
  checkOut: string
  nights: number
  rooms: RoomAvailability[]
}

export type CheckAvailabilityOutput = CheckAvailabilitySuccess | ToolFailure

export interface CheckAvailabilityDeps {
  fetchRoomAvailability: typeof fetchRoomAvailability
  fetchRoomPrices: typeof fetchRoomPrices
  applyManualBlocks: typeof applyManualBlocks
}

const defaultDeps: CheckAvailabilityDeps = { fetchRoomAvailability, fetchRoomPrices, applyManualBlocks }

function parseStay(input: CheckAvailabilityInput): NightRange | ToolFailure {
  const range = stayToNightRange(input.start_date, input.end_date)
  if (!range) return invalidInput('end_date (check-out) must be after start_date (check-in).')
  const parsed = nightRangeSchema.safeParse(range)
  if (!parsed.success) return invalidInput(parsed.error.issues.map((issue) => issue.message).join('; '))
  if (countNights(range) > MAX_AVAILABILITY_NIGHTS) {
    return invalidInput(`Ask about at most ${MAX_AVAILABILITY_NIGHTS} nights at a time.`)
  }
  return range
}

async function checkRoom(
  resolved: ResolvedRoom,
  range: NightRange,
  nights: string[],
  deps: CheckAvailabilityDeps,
): Promise<RoomAvailability | ToolFailure> {
  const [availability, prices] = await Promise.all([
    deps.fetchRoomAvailability(resolved.target, range),
    deps.fetchRoomPrices(resolved.target, range),
  ])
  if (!availability.ok) return beds24Failure(availability.error)
  if (!prices.ok) return beds24Failure(prices.error)

  const effective = await deps.applyManualBlocks(resolved.target.userId, resolved.target.roomId, nights, availability.data)
  const freeNights = nights.filter((date) => effective[date])
  const unavailableNights = nights.filter((date) => !effective[date])

  return {
    roomId: resolved.room.roomId,
    roomName: resolved.room.name,
    fullyAvailable: unavailableNights.length === 0,
    availableStays: groupConsecutiveNights(freeNights),
    unavailableNights,
    nightlyPrices: Object.fromEntries(nights.map((date) => [date, prices.data[date] ?? null])),
  }
}

export async function checkAvailability(
  context: AssistantContext,
  input: CheckAvailabilityInput,
  deps: CheckAvailabilityDeps = defaultDeps,
): Promise<CheckAvailabilityOutput> {
  const range = parseStay(input)
  if (isToolFailure(range)) return range

  const scope = resolveRooms(context, { propertyId: input.property_id, roomId: input.room_id })
  if (!scope.ok) return scopeFailure(scope.error)

  const nights = listNights(range)
  const results = await Promise.all(scope.value.map((resolved) => checkRoom(resolved, range, nights, deps)))
  const failure = results.find(isToolFailure)
  if (failure) return failure

  return {
    ok: true,
    propertyId: scope.value[0].target.propertyId,
    checkIn: input.start_date,
    checkOut: input.end_date,
    nights: nights.length,
    rooms: results as RoomAvailability[],
  }
}
