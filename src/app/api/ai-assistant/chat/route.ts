import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createAssistantModel } from '@/lib/ai-assistant/config'
import { runAssistant } from '@/lib/ai-assistant/runAssistant'
import { logRequest, recordUsage } from '@/lib/ai-assistant/usage/requestLog'
import { prepareWebChat } from '@/lib/ai-assistant/web/prepareWebChat'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const prepared = await prepareWebChat(session?.user?.id, await readJson(request))

  if (!prepared.ok) {
    const headers = prepared.retryAfterSeconds ? { 'Retry-After': String(prepared.retryAfterSeconds) } : undefined
    return NextResponse.json({ error: prepared.error }, { status: prepared.status, headers })
  }

  const { config, context, messages } = prepared
  const requestId = await logRequest(context.userId, 'web', config.modelId)

  const result = runAssistant({
    context,
    messages,
    model: createAssistantModel(config),
    abortSignal: request.signal,
    onUsage: (usage) => recordUsage(requestId, usage),
  })

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error('[ai-assistant] Chat stream failed', { userId: context.userId, error })
      return 'אירעה שגיאה. נסה שוב.'
    },
  })
}
