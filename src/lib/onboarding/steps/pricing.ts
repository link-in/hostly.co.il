import { beds24Request, type OnboardingCallContext } from '../beds24Client'
import { multiplePostResponseSchema } from '../schemas'

export interface BasePriceInput {
  roomId: string
  price: number
  minStay: number
  months: number
}

export interface BasePriceResult extends Record<string, unknown> {
  price: number
  minStay: number
  from: string
  to: string
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function buildBasePriceRange(months: number, today = new Date()): { from: string; to: string } {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + months)
  return { from: formatDate(start), to: formatDate(end) }
}

export function buildBasePricePayload(input: BasePriceInput, range: { from: string; to: string }) {
  return [{
    roomId: Number(input.roomId),
    calendar: [{
      from: range.from,
      to: range.to,
      price1: input.price,
      numAvail: 1,
      minStay: input.minStay,
    }],
  }]
}

/** Sets a flat base price and opens availability for the given number of months. */
export async function setBasePrice(
  ctx: OnboardingCallContext,
  input: BasePriceInput,
  today = new Date(),
): Promise<BasePriceResult> {
  const range = buildBasePriceRange(input.months, today)
  await beds24Request(ctx, {
    method: 'POST',
    path: '/inventory/rooms/calendar',
    body: buildBasePricePayload(input, range),
    schema: multiplePostResponseSchema,
  })
  return { price: input.price, minStay: input.minStay, ...range }
}
