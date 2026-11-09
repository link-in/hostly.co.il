/**
 * עדכון מחיר מרוכז לחודש: מחיר אחד ללילות סוף שבוע ומחיר אחד לשאר הלילות.
 * לוגיקה טהורה (ללא I/O ובלי React) כדי שאפשר לבדוק אותה בקלות.
 */
import { z } from 'zod'
import { buildDateRanges, normalizeDate } from '@/lib/dashboard/calendarDates'

/** לילות סוף שבוע בישראל: חמישי ושישי (`Date.getDay()`: 4 = חמישי, 5 = שישי). */
export const WEEKEND_NIGHT_WEEKDAYS: readonly number[] = [4, 5]

export const isWeekendNight = (date: Date): boolean => WEEKEND_NIGHT_WEEKDAYS.includes(date.getDay())

const MAX_NIGHTLY_PRICE = 100_000

const priceField = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : Number(value)))
  .pipe(
    z
      .number({ error: 'המחיר חייב להיות מספר' })
      .positive({ error: 'המחיר חייב להיות גדול מאפס' })
      .max(MAX_NIGHTLY_PRICE, { error: 'המחיר גבוה מדי' })
      .optional(),
  )

const bulkPriceFormSchema = z
  .object({ weekendPrice: priceField, midweekPrice: priceField })
  .refine((value) => value.weekendPrice !== undefined || value.midweekPrice !== undefined, {
    error: 'יש להזין מחיר לסוף שבוע, לאמצע שבוע, או לשניהם',
  })

export interface BulkPriceInput {
  weekendPrice?: number
  midweekPrice?: number
}

export interface BulkPriceFormFields {
  weekendPrice: string
  midweekPrice: string
}

export type ParsedBulkPriceForm = { ok: true; value: BulkPriceInput } | { ok: false; error: string }

export function parseBulkPriceForm(fields: BulkPriceFormFields): ParsedBulkPriceForm {
  const result = bulkPriceFormSchema.safeParse(fields)
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? 'המחיר שהוזן אינו תקין' }
  }
  return { ok: true, value: result.data }
}

export interface PriceNight {
  date: Date
  price: number
}

function priceForNight(date: Date, input: BulkPriceInput): number | undefined {
  return isWeekendNight(date) ? input.weekendPrice : input.midweekPrice
}

/**
 * כל הלילות בחודש של `month` שיקבלו מחיר חדש.
 * לילות שעברו (לפני `today`) לא מתעדכנים. לילה בלי מחיר מתאים (שדה ריק) מדולג.
 */
export function listMonthNights(month: Date, input: BulkPriceInput, today: Date): PriceNight[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const start = normalizeDate(today) > first ? normalizeDate(today) : first

  const nights: PriceNight[] = []
  for (const cursor = new Date(start); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    const price = priceForNight(cursor, input)
    if (price !== undefined) nights.push({ date: new Date(cursor), price })
  }
  return nights
}

export interface BulkCalendarEntry {
  from: string
  to: string
  price1: number
}

/** מאחד לילות רצופים עם אותו מחיר לטווחים, כדי לשלוח ל-Beds24 מעט רשומות. */
export function buildBulkCalendar(nights: PriceNight[]): BulkCalendarEntry[] {
  const datesByPrice = new Map<number, Date[]>()
  for (const night of nights) {
    datesByPrice.set(night.price, [...(datesByPrice.get(night.price) ?? []), night.date])
  }

  const entries: BulkCalendarEntry[] = []
  for (const [price, dates] of datesByPrice) {
    for (const range of buildDateRanges(dates)) {
      entries.push({ from: range.from, to: range.to, price1: price })
    }
  }
  return entries.sort((a, b) => a.from.localeCompare(b.from))
}

export interface BulkSummary {
  total: number
  weekendNights: number
  midweekNights: number
}

export function summarizeNights(nights: PriceNight[]): BulkSummary {
  const weekendNights = nights.filter((night) => isWeekendNight(night.date)).length
  return { total: nights.length, weekendNights, midweekNights: nights.length - weekendNights }
}
