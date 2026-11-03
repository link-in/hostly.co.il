import type { AssistantContext } from '../context'
import { createPendingAction } from '../actions/pendingActions'
import type { ProposedAction } from '../actions/types'
import type { ToolFailure } from './results'

export interface ProposalSuccess {
  ok: true
  status: 'awaiting_confirmation'
  actionId: string
  expiresAt: string
  action: ProposedAction
  instructions: string
}

export type ProposalOutput = ProposalSuccess | ToolFailure

export interface ProposalDeps {
  createPendingAction: typeof createPendingAction
}

export const defaultProposalDeps: ProposalDeps = { createPendingAction }

const CONFIRMATION_INSTRUCTIONS =
  'Nothing has changed yet. Summarise the change (room, exact nights, and prices if relevant) ' +
  'and tell the user to approve it with the confirmation button. Never say it is done.'

export async function saveProposal(
  context: AssistantContext,
  action: ProposedAction,
  deps: ProposalDeps,
): Promise<ProposalSuccess> {
  const created = await deps.createPendingAction(context.userId, context.channel, action)
  return {
    ok: true,
    status: 'awaiting_confirmation',
    actionId: created.id,
    expiresAt: created.expiresAt,
    action,
    instructions: CONFIRMATION_INSTRUCTIONS,
  }
}
