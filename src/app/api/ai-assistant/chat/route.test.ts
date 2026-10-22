import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { prepareWebChat } from '@/lib/ai-assistant/web/prepareWebChat'
import { logRequest } from '@/lib/ai-assistant/usage/requestLog'
import { runAssistant } from '@/lib/ai-assistant/runAssistant'
import { POST } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/ai-assistant/web/prepareWebChat', () => ({ prepareWebChat: vi.fn() }))
vi.mock('@/lib/ai-assistant/usage/requestLog', () => ({ logRequest: vi.fn(async () => 'req-1'), recordUsage: vi.fn() }))
vi.mock('@/lib/ai-assistant/runAssistant', () => ({ runAssistant: vi.fn() }))
vi.mock('@/lib/ai-assistant/config', () => ({ createAssistantModel: vi.fn(() => 'model') }))

function chatRequest(body: unknown = { messages: [] }) {
  return new Request('http://localhost/api/ai-assistant/chat', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never)
})

describe('POST /api/ai-assistant/chat', () => {
  it('passes the session user id, never one from the body', async () => {
    vi.mocked(prepareWebChat).mockResolvedValue({ ok: false, status: 400, error: 'x' })
    await POST(chatRequest({ userId: 'someone-else', messages: [] }))
    expect(prepareWebChat).toHaveBeenCalledWith('user-1', { userId: 'someone-else', messages: [] })
  })

  it('returns the prepared error with Retry-After when rate limited', async () => {
    vi.mocked(prepareWebChat).mockResolvedValue({ ok: false, status: 429, error: 'מגבלה', retryAfterSeconds: 90 })

    const response = await POST(chatRequest())

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('90')
    expect(await response.json()).toEqual({ error: 'מגבלה' })
    expect(logRequest).not.toHaveBeenCalled()
    expect(runAssistant).not.toHaveBeenCalled()
  })

  it('logs the request and streams the assistant response', async () => {
    const context = { userId: 'user-1', displayName: '', channel: 'web' as const, properties: [] }
    vi.mocked(prepareWebChat).mockResolvedValue({
      ok: true,
      config: { enabled: true, apiKey: 'sk', modelId: 'claude-sonnet-5-5', rateLimitPerHour: 30 },
      context,
      messages: [{ role: 'user', content: 'hi' }],
    })
    const streamed = new Response('stream')
    vi.mocked(runAssistant).mockReturnValue({ toUIMessageStreamResponse: () => streamed } as never)

    const response = await POST(chatRequest())

    expect(logRequest).toHaveBeenCalledWith('user-1', 'web', 'claude-sonnet-5-5')
    expect(runAssistant).toHaveBeenCalledWith(expect.objectContaining({ context, model: 'model' }))
    expect(response).toBe(streamed)
  })
})
