import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabaseClient } from '../helpers/fakeSupabase'
import { createFakeBeds24 } from '../helpers/fakeBeds24'

const mocks = vi.hoisted(() => ({
  db: null as unknown,
  fetch: vi.fn(),
  session: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => mocks.db }))
vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: mocks.fetch }))

import { GET as getOverview } from '@/app/api/admin/onboarding/[userId]/route'
import { POST as postProperty } from '@/app/api/admin/onboarding/[userId]/property/route'
import { POST as postBasePrice } from '@/app/api/admin/onboarding/[userId]/base-price/route'
import { GET as getListings } from '@/app/api/admin/onboarding/[userId]/airbnb/listings/route'
import { POST as postSkip } from '@/app/api/admin/onboarding/[userId]/skip/route'
import { POST as postAdminCreateProperty } from '@/app/api/admin/beds24/create-property/route'
import { resetCreditSnapshot } from '@/lib/onboarding/credits'

const USER_ID = 'client-1'
const params = (userId = USER_ID) => ({ params: Promise.resolve({ userId }) })

function jsonRequest(path: string, body: unknown, rawBody?: string): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody ?? JSON.stringify(body),
  })
}

beforeEach(() => {
  resetCreditSnapshot()
  mocks.session.mockReset().mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
  mocks.fetch.mockReset().mockImplementation(
    createFakeBeds24({
      'POST /properties': { body: [{ success: true, new: { id: 301, roomTypes: [{ id: 601 }] } }] },
    }).fetchImpl,
  )
  mocks.db = createFakeSupabaseClient({
    users: [{ id: USER_ID, email: 'c@example.com', display_name: 'C', onboarding_state: {} }],
  })
})

describe('onboarding routes – auth', () => {
  it('rejects non-admin sessions with 403', async () => {
    mocks.session.mockResolvedValue({ user: { id: USER_ID, role: 'owner' } })

    const res = await postProperty(jsonRequest('/x', { mode: 'create', name: 'Villa' }), params())

    expect(res.status).toBe(403)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('rejects anonymous requests with 403', async () => {
    mocks.session.mockResolvedValue(null)
    expect((await getOverview(new Request('http://localhost/x'), params())).status).toBe(403)
  })

  it('restricts the standalone create-property route to admins', async () => {
    mocks.session.mockResolvedValue({ user: { id: USER_ID, role: 'owner' } })
    expect((await postAdminCreateProperty(jsonRequest('/x', { name: 'Villa' }))).status).toBe(403)
  })
})

describe('onboarding routes – validation', () => {
  it('returns 400 for malformed JSON', async () => {
    expect((await postProperty(jsonRequest('/x', null, '{bad'), params())).status).toBe(400)
  })

  it('returns 422 for invalid step input', async () => {
    const res = await postProperty(jsonRequest('/x', { mode: 'create', name: 'x' }), params())
    expect(res.status).toBe(422)
  })

  it('returns 422 when skipping a step that is not optional', async () => {
    expect((await postSkip(jsonRequest('/x', { step: 'property' }), params())).status).toBe(422)
  })

  it('returns 422 for a non-numeric Airbnb user ID', async () => {
    const res = await getListings(new Request('http://localhost/x?airbnbUserId=abc'), params())
    expect(res.status).toBe(422)
  })
})

describe('onboarding routes – flow', () => {
  it('returns 409 when a step runs before its prerequisites', async () => {
    const res = await postBasePrice(jsonRequest('/x', { price: 500 }), params())
    expect(res.status).toBe(409)
  })

  it('returns 404 for an unknown client', async () => {
    expect((await getOverview(new Request('http://localhost/x'), params('missing'))).status).toBe(404)
  })

  it('creates the property and reports it in the overview', async () => {
    const res = await postProperty(jsonRequest('/x', { mode: 'create', name: 'Villa Dafna' }), params())
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ alreadyDone: false, data: { propertyId: '301', roomId: '601' } })

    const overview = await (await getOverview(new Request('http://localhost/x'), params())).json()
    expect(overview.client).toMatchObject({ propertyId: '301', roomId: '601:Villa Dafna' })
    expect(overview.steps.property.status).toBe('done')
  })

  it('admin create-property returns the new property and room IDs', async () => {
    const res = await postAdminCreateProperty(jsonRequest('/x', { name: 'Standalone' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ propertyId: '301', roomId: '601', name: 'Standalone' })
  })
})
