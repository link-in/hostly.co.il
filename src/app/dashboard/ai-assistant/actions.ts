'use server'

import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/authOptions'
import { isAssistantEnabled } from '@/lib/ai-assistant/config'
import { confirmPendingAction, rejectPendingAction, type ExecutionOutcome } from '@/lib/ai-assistant/actions/executeAction'

const actionIdSchema = z.string().uuid()

type Resolver = typeof confirmPendingAction

async function resolve(actionId: unknown, resolver: Resolver): Promise<ExecutionOutcome> {
  if (!isAssistantEnabled()) return { ok: false, code: 'not_found', message: 'העוזר החכם אינו זמין.' }

  const parsedId = actionIdSchema.safeParse(actionId)
  if (!parsedId.success) return { ok: false, code: 'not_found', message: 'הפעולה לא נמצאה.' }

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return { ok: false, code: 'not_found', message: 'יש להתחבר מחדש.' }

  try {
    return await resolver(userId, parsedId.data)
  } catch (err) {
    console.error('[ai-assistant] Failed to resolve pending action', { actionId: parsedId.data, err })
    return { ok: false, code: 'beds24_failed', message: 'אירעה שגיאה. לוח השנה לא השתנה.' }
  }
}

/** Runs a change the assistant prepared. The user id comes from the session only. */
export async function confirmAssistantAction(actionId: string): Promise<ExecutionOutcome> {
  return resolve(actionId, confirmPendingAction)
}

export async function rejectAssistantAction(actionId: string): Promise<ExecutionOutcome> {
  return resolve(actionId, rejectPendingAction)
}
