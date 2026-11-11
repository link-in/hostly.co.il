import { stepCountIs, streamText, type LanguageModel, type LanguageModelUsage, type ModelMessage } from 'ai'
import type { AssistantContext } from './context'
import { buildSystemPrompt } from './systemPrompt'
import { buildAssistantTools } from './tools'

/** Bounds one user turn: list -> check -> propose -> answer fits comfortably. */
export const MAX_STEPS_PER_TURN = 6

export interface RunAssistantOptions {
  context: AssistantContext
  messages: ModelMessage[]
  model: LanguageModel
  now?: Date
  abortSignal?: AbortSignal
  onUsage?: (usage: LanguageModelUsage) => void | Promise<void>
}

/** Channel-agnostic core shared by the web chat and (later) the WhatsApp webhook. */
export function runAssistant({ context, messages, model, now = new Date(), abortSignal, onUsage }: RunAssistantOptions) {
  return streamText({
    model,
    instructions: buildSystemPrompt(context, now),
    messages,
    tools: buildAssistantTools(context),
    stopWhen: stepCountIs(MAX_STEPS_PER_TURN),
    abortSignal,
    onEnd: async (event) => {
      await onUsage?.(event.totalUsage)
    },
  })
}
