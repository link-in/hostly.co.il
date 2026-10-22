import { nightRangeSchema, type NightRange } from '../beds24/types'
import { countNights, stayToNightRange } from '../dates'
import { invalidInput, type ToolFailure } from './results'

export interface WriteStay {
  range: NightRange
  checkIn: string
  checkOut: string
  nights: number
}

/** Validates a stay for a write: real dates, check-out after check-in, nothing in the past (Israel time). */
export function parseWriteStay(startDate: string, endDate: string, today: string): WriteStay | ToolFailure {
  const range = stayToNightRange(startDate, endDate)
  if (!range) return invalidInput('end_date (check-out) must be after start_date (check-in).')

  const parsed = nightRangeSchema.safeParse(range)
  if (!parsed.success) return invalidInput(parsed.error.issues.map((issue) => issue.message).join('; '))

  if (range.from < today) return invalidInput(`Cannot change past nights. Today is ${today}.`)

  return { range, checkIn: startDate, checkOut: endDate, nights: countNights(range) }
}