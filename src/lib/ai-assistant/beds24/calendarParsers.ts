import { z } from 'zod'
import { expandDateRangeLocal } from '@/lib/availability/blocking'
import type { AvailabilityByDate, NightRange, PriceByDate } from './types'

const roomRef = { roomId: z.coerce.string().optional(), id: z.coerce.string().optional() }

const availabilityResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(
    z.object({
      ...roomRef,
      availability: z.record(z.string(), z.union([z.boolean(), z.number()])).default({}),
    }),
  ),
})

const calendarResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(
    z.object({
      ...roomRef,
      calendar: z
        .array(
          z.object({
            from: z.string(),
            to: z.string().optional(),
            price1: z.coerce.number().optional(),
          }),
        )
        .default([]),
    }),
  ),
})

type RoomRef = { roomId?: string; id?: string }

function matchesRoom(item: RoomRef, roomId: number): boolean {
  const itemRoomId = item.roomId ?? item.id
  return itemRoomId === undefined || itemRoomId === String(roomId)
}

function isInRange(date: string, range: NightRange): boolean {
  return date >= range.from && date <= range.to
}

/** Parses GET /inventory/rooms/availability. Returns null when the shape is not recognised. */
export function parseAvailabilityResponse(body: unknown, roomId: number, range: NightRange): AvailabilityByDate | null {
  const parsed = availabilityResponseSchema.safeParse(body)
  if (!parsed.success) return null

  const result: AvailabilityByDate = {}
  for (const item of parsed.data.data) {
    if (!matchesRoom(item, roomId)) continue
    for (const [date, value] of Object.entries(item.availability)) {
      if (!isInRange(date, range)) continue
      result[date] = typeof value === 'boolean' ? value : value > 0
    }
  }
  return result
}

/** Parses GET /inventory/rooms/calendar (includePrices). Returns null when the shape is not recognised. */
export function parseCalendarPricesResponse(body: unknown, roomId: number, range: NightRange): PriceByDate | null {
  const parsed = calendarResponseSchema.safeParse(body)
  if (!parsed.success) return null

  const result: PriceByDate = {}
  for (const item of parsed.data.data) {
    if (!matchesRoom(item, roomId)) continue
    for (const entry of item.calendar) {
      if (entry.price1 === undefined || !(entry.price1 > 0)) continue
      for (const date of expandDateRangeLocal(entry.from, entry.to ?? entry.from)) {
        if (isInRange(date, range)) result[date] = entry.price1
      }
    }
  }
  return result
}
