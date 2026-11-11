import { tool } from 'ai'
import type { AssistantContext } from '../context'
import { checkAvailability } from './checkAvailability'
import { listProperties } from './listProperties'
import { proposeBlockDates } from './proposeBlockDates'
import { proposeUpdatePrice } from './proposeUpdatePrice'
import {
  blockDatesInputSchema,
  checkAvailabilityInputSchema,
  listPropertiesInputSchema,
  updatePriceInputSchema,
} from './schemas'

/** Tools bound to one user's context. The model cannot choose the account; only IDs within it. */
export function buildReadTools(context: AssistantContext) {
  return {
    list_properties: tool({
      description: "List the user's properties and rooms with their IDs. Call this before using any ID.",
      inputSchema: listPropertiesInputSchema,
      execute: async () => listProperties(context),
    }),
    check_availability: tool({
      description:
        'Check which nights are free for a stay, per room, including nightly prices. ' +
        'Dates use check-in / check-out: the check-out night is not included.',
      inputSchema: checkAvailabilityInputSchema,
      execute: async (input) => checkAvailability(context, input),
    }),
  }
}

/** Write tools only PROPOSE a change. It runs after the user presses the confirmation button. */
export function buildWriteTools(context: AssistantContext) {
  return {
    block_dates: tool({
      description:
        'Propose closing a room for a range of nights (renovation, personal use, etc.). ' +
        'Creates a change that waits for the user to confirm; nothing is blocked until then.',
      inputSchema: blockDatesInputSchema,
      execute: async (input) => proposeBlockDates(context, input),
    }),
    update_price: tool({
      description:
        'Propose a new BASE nightly price for a range of nights. ' +
        'Creates a change that waits for the user to confirm; prices do not change until then.',
      inputSchema: updatePriceInputSchema,
      execute: async (input) => proposeUpdatePrice(context, input),
    }),
  }
}

export function buildAssistantTools(context: AssistantContext) {
  return { ...buildReadTools(context), ...buildWriteTools(context) }
}

export type AssistantTools = ReturnType<typeof buildAssistantTools>
