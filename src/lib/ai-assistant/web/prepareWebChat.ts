/**
 * Everything the web chat route checks before spending a model call:
 * feature flag, account eligibility, rate limit and a strictly validated history.
 *
 * The client sends the whole UI history, so it is untrusted input: only user and
 * assistant messages are accepted (no injected system prompts), sizes are capped,
 * and tool parts are validated against the real tool schemas. Forged tool results
 * cannot widen access — every tool re-checks IDs against the DB-loaded context.
 */
import { convertToModelMessages, safeValidateUIMessages, type ModelMessage, type UIMessage } from 'ai'
import { z } from 'zod'
import { getAssistantConfig, type AssistantConfig } from '../config'
import { loadAssistantContext, type AssistantContext, type ContextErrorCode } from '../context'
import { buildAssistantTools } from '../tools'
import { checkRateLimit } from '../usage/requestLog'

export const MAX_HISTORY_MESSAGES = 30
export const MAX_USER_MESSAGE_CHARS = 2000

export type PrepareResult =
  | { ok: true; config: AssistantConfig; context: AssistantContext; messages: ModelMessage[] }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number }

export interface PrepareDeps {
  getAssistantConfig: typeof getAssistantConfig
  loadAssistantContext: typeof loadAssistantContext
  checkRateLimit: typeof checkRateLimit
}

const defaultDeps: PrepareDeps = { getAssistantConfig, loadAssistantContext, checkRateLimit }

const CONTEXT_ERRORS: Record<ContextErrorCode, { status: number; error: string }> = {
  user_not_found: { status: 401, error: 'יש להתחבר מחדש.' },
  demo_account: { status: 403, error: 'העוזר החכם אינו זמין בחשבון הדמו.' },
  beds24_suspended: { status: 403, error: 'החיבור למערכת ניהול הנכסים מושהה. יש לחדש את הקרדיט בחשבון.' },
  no_property: { status: 403, error: 'לא הוגדר נכס לחשבון שלך.' },
  no_rooms: { status: 403, error: 'לא הוגדרו חדרים לנכס שלך.' },
}

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
})

function fail(status: number, error: string): PrepareResult {
  return { ok: false, status, error }
}

function userText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')
}

/** Validates the client-sent history and converts it for the model. Returns an error string when invalid. */
export async function parseHistory(body: unknown, context: AssistantContext): Promise<ModelMessage[] | string> {
  const parsedBody = bodySchema.safeParse(body)
  if (!parsedBody.success) return 'בקשה לא תקינה.'

  const tools = buildAssistantTools(context)
  const validated = await safeValidateUIMessages({ messages: parsedBody.data.messages.slice(-MAX_HISTORY_MESSAGES), tools })
  if (!validated.success) return 'בקשה לא תקינה.'

  const messages = validated.data
  if (messages.some((message) => message.role !== 'user' && message.role !== 'assistant')) return 'בקשה לא תקינה.'

  const last = messages[messages.length - 1]
  if (last.role !== 'user' || !userText(last).trim()) return 'יש לכתוב הודעה.'
  if (messages.some((message) => message.role === 'user' && userText(message).length > MAX_USER_MESSAGE_CHARS)) {
    return `ההודעה ארוכה מדי (עד ${MAX_USER_MESSAGE_CHARS} תווים).`
  }

  return convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true })
}

export async function prepareWebChat(
  userId: string | undefined,
  body: unknown,
  deps: PrepareDeps = defaultDeps,
): Promise<PrepareResult> {
  const config = deps.getAssistantConfig()
  if (!config.enabled) return fail(404, 'העוזר החכם אינו זמין.')
  if (!userId) return fail(401, 'יש להתחבר מחדש.')

  const loaded = await deps.loadAssistantContext(userId, 'web')
  if (!loaded.ok) {
    const { status, error } = CONTEXT_ERRORS[loaded.code]
    return fail(status, error)
  }

  const rate = await deps.checkRateLimit(userId, config.rateLimitPerHour)
  if (!rate.allowed) {
    return { ok: false, status: 429, error: 'הגעת למגבלת השימוש לשעה. נסה שוב מאוחר יותר.', retryAfterSeconds: rate.retryAfterSeconds }
  }

  const messages = await parseHistory(body, loaded.context)
  if (typeof messages === 'string') return fail(400, messages)

  return { ok: true, config, context: loaded.context, messages }
}
