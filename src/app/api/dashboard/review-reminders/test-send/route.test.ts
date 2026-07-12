/**
 * Integration tests for the "send preview to my own number" endpoint.
 * `next-auth` session and `sendWhatsAppMessage` are mocked — no real network call.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { POST } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: vi.fn() }))

function postRequest(body?: unknown): Request {
  return new Request('http://localhost/api/dashboard/review-reminders/test-send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const TEST_SESSION_USER = {
  id: 'user-1',
  email: 'host@example.com',
  displayName: 'Mountain View',
  phoneNumber: '+972521234567',
  googleReviewUrl: 'https://g.page/r/abc123',
  role: 'owner' as const,
}

beforeEach(() => {
  vi.mocked(getServerSession).mockReset()
  vi.mocked(sendWhatsAppMessage).mockReset()
  vi.mocked(sendWhatsAppMessage).mockResolvedValue({ success: true, provider: 'mock' })
})

describe('POST /api/dashboard/review-reminders/test-send', () => {
  it('rejects an unauthenticated request', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never)
    const response = await POST(postRequest({}))
    expect(response.status).toBe(401)
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('rejects when the host has no phone number configured', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { ...TEST_SESSION_USER, phoneNumber: undefined },
    } as never)

    const response = await POST(postRequest({}))
    expect(response.status).toBe(400)
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('sends a labeled preview message to the host own number for the default (direct) channel', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_SESSION_USER } as never)

    const response = await POST(postRequest({}))
    expect(response.status).toBe(200)

    const [{ to, message }] = vi.mocked(sendWhatsAppMessage).mock.calls[0]
    expect(to).toContain('972521234567')
    expect(message).toContain('הודעת בדיקה')
    expect(message).toContain('https://g.page/r/abc123')
  })

  it('honors an explicit channel and falls back to "direct" for an invalid one', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_SESSION_USER } as never)

    await POST(postRequest({ channel: 'airbnb' }))
    let [{ message }] = vi.mocked(sendWhatsAppMessage).mock.calls[0]
    expect(message).toContain('Airbnb')

    vi.mocked(sendWhatsAppMessage).mockClear()
    await POST(postRequest({ channel: 'not-a-real-channel' }))
    ;[{ message }] = vi.mocked(sendWhatsAppMessage).mock.calls[0]
    expect(message).toContain('https://g.page/r/abc123')
  })

  it('returns 502 when the WhatsApp send fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_SESSION_USER } as never)
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({ success: false, provider: 'mock', error: 'boom' })

    const response = await POST(postRequest({}))
    expect(response.status).toBe(502)
    const body = await response.json()
    expect(body.error).toBe('boom')
  })
})
