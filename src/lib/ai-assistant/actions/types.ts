import { z } from 'zod'

export const PENDING_ACTION_TTL_MS = 15 * 60 * 1000

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const stayFields = {
  propertyId: z.number().int().positive(),
  roomId: z.number().int().positive(),
  roomName: z.string(),
  /** First and last night, inclusive (Beds24 semantics). */
  from: isoDate,
  to: isoDate,
  checkIn: isoDate,
  checkOut: isoDate,
  nights: z.number().int().positive(),
}

export const blockDatesPayloadSchema = z.object({
  ...stayFields,
  reason: z.string(),
})

export const updatePricePayloadSchema = z.object({
  ...stayFields,
  newPrice: z.number().positive(),
  channelPrices: z.array(z.object({ channelKey: z.string(), name: z.string(), price: z.number() })),
})

export type BlockDatesPayload = z.infer<typeof blockDatesPayloadSchema>
export type UpdatePricePayload = z.infer<typeof updatePricePayloadSchema>

export type ProposedAction =
  | { actionType: 'block_dates'; payload: BlockDatesPayload }
  | { actionType: 'update_price'; payload: UpdatePricePayload }

export const proposedActionSchema = z.discriminatedUnion('actionType', [
  z.object({ actionType: z.literal('block_dates'), payload: blockDatesPayloadSchema }),
  z.object({ actionType: z.literal('update_price'), payload: updatePricePayloadSchema }),
])

export type PendingActionStatus = 'pending' | 'executing' | 'executed' | 'rejected' | 'expired' | 'failed'

export interface PendingActionRow {
  id: string
  user_id: string
  channel: 'web' | 'whatsapp'
  action_type: ProposedAction['actionType']
  payload: unknown
  status: PendingActionStatus
  result: unknown
  expires_at: string
  created_at: string
  resolved_at: string | null
}
