import { calculateChannelPrices } from '@/lib/pricing/channelPricing'
import type { AssistantContext } from '../context'
import { todayInIsrael } from '../dates'
import { resolveSingleRoom } from './propertyScope'
import { defaultProposalDeps, saveProposal, type ProposalDeps, type ProposalOutput } from './proposeAction'
import { isToolFailure, scopeFailure } from './results'
import type { UpdatePriceInput } from './schemas'
import { parseWriteStay } from './writeStay'

/**
 * Proposes a new base nightly price. The preview shows the resulting channel prices
 * (Airbnb/Booking at 1.21) — those uplifts come from the channel mapping, so the
 * base price itself is sent to Beds24 unmultiplied.
 */
export async function proposeUpdatePrice(
  context: AssistantContext,
  input: UpdatePriceInput,
  deps: ProposalDeps = defaultProposalDeps,
  today: string = todayInIsrael(),
): Promise<ProposalOutput> {
  const stay = parseWriteStay(input.start_date, input.end_date, today)
  if (isToolFailure(stay)) return stay

  const scope = resolveSingleRoom(context, { propertyId: input.property_id, roomId: input.room_id })
  if (!scope.ok) return scopeFailure(scope.error)

  const newPrice = Math.round(input.new_price)

  return saveProposal(
    context,
    {
      actionType: 'update_price',
      payload: {
        propertyId: scope.value.target.propertyId,
        roomId: scope.value.target.roomId,
        roomName: scope.value.room.name,
        from: stay.range.from,
        to: stay.range.to,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        nights: stay.nights,
        newPrice,
        channelPrices: calculateChannelPrices(newPrice).map(({ channelKey, name, price }) => ({ channelKey, name, price })),
      },
    },
    deps,
  )
}
