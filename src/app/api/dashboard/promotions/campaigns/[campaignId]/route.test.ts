import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import { createFakeDeps, seedCampaign } from '@/__tests__/helpers/fakePromotions'
import { createDefaultDeps } from '@/lib/promotions/pipeline/defaultDeps'
import { PATCH, POST } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/promotions/pipeline/defaultDeps', () => ({ createDefaultDeps: vi.fn() }))

const params = { params: Promise.resolve({ campaignId: 'c1' }) }

function request(method: string, body: unknown) {
  return new Request('http://localhost/api/dashboard/promotions/campaigns/c1', {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

let fake: ReturnType<typeof createFakeDeps>

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as never)
  fake = createFakeDeps({ campaigns: [seedCampaign({ checkIn: '2099-01-10', checkOut: '2099-01-12' })] })
  vi.mocked(createDefaultDeps).mockReturnValue(fake.deps)
})

describe('POST /api/dashboard/promotions/campaigns/[id]', () => {
  it('requires a session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await POST(request('POST', { action: 'approve' }), params)).status).toBe(401)
  })

  it('blocks demo users from spending', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', isDemo: true } } as never)
    expect((await POST(request('POST', { action: 'approve' }), params)).status).toBe(403)
    expect(fake.publisher.launch).not.toHaveBeenCalled()
  })

  it('validates the action', async () => {
    expect((await POST(request('POST', { action: 'publish-everything' }), params)).status).toBe(422)
  })

  it('approves and returns the active campaign', async () => {
    const response = await POST(request('POST', { action: 'approve' }), params)
    expect(response.status).toBe(200)
    expect((await response.json()).campaign.status).toBe('active')
  })

  it('maps domain errors to HTTP statuses', async () => {
    await POST(request('POST', { action: 'reject' }), params)
    const response = await POST(request('POST', { action: 'approve' }), params)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'invalid_state' })
  })
})

describe('PATCH /api/dashboard/promotions/campaigns/[id]', () => {
  it('rejects invalid copy', async () => {
    const response = await PATCH(request('PATCH', { content: { headline: '' } }), params)
    expect(response.status).toBe(422)
  })

  it('updates the budget of a draft', async () => {
    const response = await PATCH(request('PATCH', { totalBudget: 150 }), params)
    expect((await response.json()).campaign.totalBudget).toBe(150)
  })
})
