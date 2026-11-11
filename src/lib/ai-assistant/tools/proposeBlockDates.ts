import type { AssistantContext } from '../context'
import { todayInIsrael } from '../dates'
import { resolveSingleRoom } from './propertyScope'
import { defaultProposalDeps, saveProposal, type ProposalDeps, type ProposalOutput } from './proposeAction'
import { isToolFailure, scopeFailure } from './results'
import type { BlockDatesInput } from './schemas'
import { parseWriteStay } from './writeStay'

/** Proposes closing a room for a stay. Writes a pending action only; Beds24 is untouched until confirmation. */
export async function proposeBlockDates(
  context: AssistantContext,
  input: BlockDatesInput,
  deps: ProposalDeps = defaultProposalDeps,
  today: string = todayInIsrael(),
): Promise<ProposalOutput> {
  const stay = parseWriteStay(input.start_date, input.end_date, today)
  if (isToolFailure(stay)) return stay

  const scope = resolveSingleRoom(context, { propertyId: input.property_id, roomId: input.room_id })
  if (!scope.ok) return scopeFailure(scope.error)

  return saveProposal(
    context,
    {
      actionType: 'block_dates',
      payload: {
        propertyId: scope.value.target.propertyId,
        roomId: scope.value.target.roomId,
        roomName: scope.value.room.name,
        from: stay.range.from,
        to: stay.range.to,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        nights: stay.nights,
        reason: input.reason,
      },
    },
    deps,
  )
}
