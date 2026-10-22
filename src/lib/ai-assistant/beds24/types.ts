import { z } from 'zod'

export const MAX_RANGE_DAYS = 366

function isRealCalendarDate(value: string): boolean {
  const time = Date.parse(`${value}T00:00:00Z`)
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine(isRealCalendarDate, 'Invalid calendar date')

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** Night range with BOTH ends inclusive — the same semantics as Beds24 calendar `from`/`to`. */
export const nightRangeSchema = z
  .object({ from: isoDate, to: isoDate })
  .refine(({ from, to }) => from <= to, { message: '`to` must not be before `from`', path: ['to'] })
  .refine(({ from, to }) => daysBetween(from, to) < MAX_RANGE_DAYS, {
    message: `Range must be shorter than ${MAX_RANGE_DAYS} days`,
    path: ['to'],
  })

export type NightRange = z.infer<typeof nightRangeSchema>

export const roomIdSchema = z.coerce.number().int().positive()

export interface RoomTarget {
  userId: string
  propertyId: number
  roomId: number
}

export type Beds24ErrorKind = 'invalid_input' | 'network' | 'http' | 'credit' | 'rejected' | 'invalid_response'

export interface Beds24Error {
  kind: Beds24ErrorKind
  message: string
  status?: number
}

export type Beds24Result<T> = { ok: true; data: T } | { ok: false; error: Beds24Error }

/** `YYYY-MM-DD` -> available for at least one unit. */
export type AvailabilityByDate = Record<string, boolean>

/** `YYYY-MM-DD` -> nightly price1 override. Dates without an override are absent. */
export type PriceByDate = Record<string, number>
