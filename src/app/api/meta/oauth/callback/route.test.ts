import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import { completeMetaOAuth } from '@/lib/promotions/publishing/meta/connectionService'
import { createSignedState } from '@/lib/security/signedState'
import { GET } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/promotions/publishing/meta/connectionService', () => ({ completeMetaOAuth: vi.fn() }))

const SECRET = 'test-secret'

function callback(query: Record<string, string>) {
  const url = new URL('http://localhost/api/meta/oauth/callback')
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return new Request(url)
}

function redirectedTo(response: Response) {
  return new URL(response.headers.get('location')!).searchParams.get('meta')
}

beforeEach(() => {
  vi.stubEnv('NEXTAUTH_SECRET', SECRET)
  vi.stubEnv('META_APP_ID', 'app')
  vi.stubEnv('META_APP_SECRET', 'secret')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost')
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as never)
  vi.mocked(completeMetaOAuth).mockReset()
})

describe('GET /api/meta/oauth/callback', () => {
  it('stores the token for the host that started the flow', async () => {
    const response = await GET(callback({ code: 'CODE', state: createSignedState('u1', SECRET) }))

    expect(redirectedTo(response)).toBe('connected')
    expect(completeMetaOAuth).toHaveBeenCalledWith('u1', 'CODE', expect.objectContaining({ appId: 'app' }))
  })

  it('rejects a state issued to another host', async () => {
    const response = await GET(callback({ code: 'CODE', state: createSignedState('u2', SECRET) }))
    expect(redirectedTo(response)).toBe('invalid')
    expect(completeMetaOAuth).not.toHaveBeenCalled()
  })

  it('rejects a forged state', async () => {
    const response = await GET(callback({ code: 'CODE', state: createSignedState('u1', 'other-secret') }))
    expect(redirectedTo(response)).toBe('invalid')
  })

  it('handles a cancelled dialog and exchange failures', async () => {
    expect(redirectedTo(await GET(callback({ error: 'access_denied' })))).toBe('cancelled')

    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(completeMetaOAuth).mockRejectedValueOnce(new Error('bad code'))
    expect(redirectedTo(await GET(callback({ code: 'CODE', state: createSignedState('u1', SECRET) })))).toBe('failed')
  })
})
