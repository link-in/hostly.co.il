import { describe, it, expect, vi, beforeEach } from 'vitest'

const userRow = {
  display_name: 'נוף הרים בדפנה',
  landing_page_url: null as string | null,
  onboarding_state: {},
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: table === 'users' ? userRow : null }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/beds24/tokenManager', () => ({
  fetchWithTokenRefresh: vi.fn(),
}))

import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { resolvePropertyChannels } from './resolvePropertyChannels'

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('resolvePropertyChannels', () => {
  beforeEach(() => {
    vi.mocked(fetchWithTokenRefresh).mockImplementation(async (url: string) => {
      if (url.includes('/channels/settings')) {
        // Raw text keeps the 19-digit ID beyond Number.MAX_SAFE_INTEGER exact, as Beds24 sends it as a string.
        return new Response(
          '{"data":[{"channel":"airbnb","properties":[{"id":306559,"roomTypes":[{"id":638851,"airbnbListingId":"1491057188555346537"}]}]}]}',
          { status: 200 }
        )
      }
      return jsonResponse({ data: [{ id: 306559, name: 'mountain view dafna' }] })
    })
  })

  it('takes the Airbnb listing ID from Beds24 and does not invent Booking or direct-site values', async () => {
    const result = await resolvePropertyChannels({ userId: 'user-1', propertyId: '306559', roomId: '638851' })

    expect(result.urls.airbnb).toBe('1491057188555346537')
    expect(result.isAutoDetected.airbnb).toBe(true)
    expect(result.urls.booking).toBe('')
    expect(result.isAutoDetected.booking).toBe(false)
    expect(result.urls.direct).toBe('')
  })

  it('uses the Beds24 property name for OTA searches over the Hebrew display name', async () => {
    const result = await resolvePropertyChannels({ userId: 'user-1', propertyId: '306559', roomId: '638851' })
    expect(result.propertyName).toBe('mountain view dafna')
  })

  it('falls back to the display name when Beds24 is unavailable', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(new Response('', { status: 401 }))
    const result = await resolvePropertyChannels({ userId: 'user-1', propertyId: '306559', roomId: '638851' })
    expect(result.propertyName).toBe('נוף הרים בדפנה')
    expect(result.urls.airbnb).toBe('')
  })
})
