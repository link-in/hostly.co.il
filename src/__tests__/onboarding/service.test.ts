import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '../helpers/fakeSupabase'
import { createFakeBeds24 } from '../helpers/fakeBeds24'

const mocks = vi.hoisted(() => ({
  db: null as unknown,
  fetch: vi.fn(),
  refreshRoomCache: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => mocks.db }))
vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: mocks.fetch }))
vi.mock('@/lib/availability/cache', () => ({
  refreshRoomCache: mocks.refreshRoomCache,
  generateApiKey: () => 'hk_test_key',
}))

import {
  getAccountPropertiesForClient,
  getOnboardingOverview,
  runAirbnbConnectStep,
  runAirbnbMultiplierStep,
  runBasePriceStep,
  runBookingComStep,
  runFinalizeStep,
  runPropertyStep,
  runVerifyChannelsStep,
  skipStep,
} from '@/lib/onboarding/service'
import { resetCreditSnapshot } from '@/lib/onboarding/credits'
import { Beds24RequestError, OnboardingNotFoundError, StepPrerequisiteError } from '@/lib/onboarding/errors'
import type { OnboardingState } from '@/lib/onboarding/state'

const USER_ID = 'client-1'
let db: FakeSupabaseClient

const happyBeds24Routes = {
  'POST /properties': { body: [{ success: true, new: { id: 301, roomTypes: [{ id: 601 }] } }] },
  'POST /inventory/rooms/calendar': { body: [{ success: true }] },
  'POST /channels/airbnb': { body: [{ success: true }] },
  'POST /channels/settings': { body: [{ success: true }] },
  'GET /channels/settings': {
    body: {
      data: [{
        channel: 'airbnb',
        properties: [{ id: 301, multiplier: 1.21, roomTypes: [{ id: 601, enabled: true, airbnbListingId: '555' }] }],
      }],
    },
  },
  'GET /accounts': { body: { data: [{ usage: { channelLinks: { airbnb: 4, booking: 2 } } }] } },
}

function useBeds24(routes: Parameters<typeof createFakeBeds24>[0] = happyBeds24Routes) {
  const beds24 = createFakeBeds24(routes)
  mocks.fetch.mockImplementation(beds24.fetchImpl)
  return beds24
}

function user() {
  return db.__table('users').find((row) => row.id === USER_ID)!
}

function state(): OnboardingState {
  return user().onboarding_state as OnboardingState
}

const createInput = { mode: 'create' as const, name: 'Villa Dafna', propertyType: 'villa' as const, maxPeople: 4, currency: 'ILS' }

beforeEach(() => {
  resetCreditSnapshot()
  mocks.fetch.mockReset()
  mocks.refreshRoomCache.mockReset().mockResolvedValue({ upserted: 365 })
  db = createFakeSupabaseClient({
    users: [{
      id: USER_ID,
      email: 'client@example.com',
      display_name: 'Client',
      property_id: null,
      room_id: null,
      onboarding_state: {},
      onboarding_completed_at: null,
      beds24_token: null,
      beds24_refresh_token: null,
    }],
  })
  mocks.db = db
})

describe('full onboarding flow on the master account', () => {
  it('runs every step in order and leaves the client ready', async () => {
    const beds24 = useBeds24()

    await runPropertyStep(USER_ID, createInput)
    await runBasePriceStep(USER_ID, { price: 600, minStay: 2, months: 12 })
    await runAirbnbConnectStep(USER_ID, { airbnbUserId: '111', airbnbListingId: '555', listingName: 'Villa' })
    await runAirbnbMultiplierStep(USER_ID)
    await runBookingComStep(USER_ID, { hotelId: '12345' })
    const verify = await runVerifyChannelsStep(USER_ID)
    const finalize = await runFinalizeStep(USER_ID)

    expect(user()).toMatchObject({ property_id: '301', room_id: '601:Villa Dafna' })
    expect(user().onboarding_completed_at).toEqual(expect.any(String))
    expect(Object.values(state().steps).every((step) => step?.status === 'done')).toBe(true)

    expect(beds24.callsTo('POST', '/channels/airbnb')[0].body).toEqual([
      { action: 'connectToExistingRoom', airbnbUserId: '111', airbnbListingId: '555', roomId: 601, connect: 'full' },
    ])
    expect(beds24.callsTo('POST', '/channels/settings')[0].body).toEqual([
      { channel: 'airbnb', properties: [{ id: 301, multiplier: 1.21 }] },
    ])
    expect(beds24.callsTo('POST', '/inventory/rooms/calendar')[0].body).toEqual([
      expect.objectContaining({ roomId: 601, calendar: [expect.objectContaining({ price1: 600, minStay: 2 })] }),
    ])

    expect(verify.data).toMatchObject({
      airbnb: { connected: true, airbnbListingId: '555', multiplier: 1.21 },
      multiplierMatches: true,
      accountLinks: { airbnb: 4, booking: 2 },
    })

    // finalize מגדיר את ה-webhook של Beds24 על הנכס (קריאה שנייה ל-POST /properties, אחרי היצירה)
    expect(beds24.callsTo('POST', '/properties')[1].body).toEqual([
      {
        id: 301,
        webhooks: {
          url: 'https://app.hostly.co.il/api/webhook',
          version: 'twoWithPersonalData',
          additionalData: 'none',
          customHeader: '',
        },
      },
    ])

    expect(mocks.refreshRoomCache).toHaveBeenCalledWith(USER_ID, '301', '601', '', '')
    expect(finalize.apiKey).toBe('hk_test_key')
    expect(db.__table('api_keys')).toEqual([
      expect.objectContaining({ user_id: USER_ID, key: 'hk_test_key', allowed_room_ids: ['601'], is_active: true }),
    ])
  })

  it('exposes progress, the OAuth link and the 1.21 multiplier in the overview', async () => {
    const overview = await getOnboardingOverview(USER_ID)
    expect(overview.client.email).toBe('client@example.com')
    expect(overview.airbnbMultiplier).toBe(1.21)
    expect(overview.airbnbAuthUrl).toContain('airbnb.com/oauth2/auth')
    expect(overview.stepOrder[0]).toBe('property')
  })

  it('throws not-found for an unknown client', async () => {
    await expect(getOnboardingOverview('missing')).rejects.toThrow(OnboardingNotFoundError)
  })
})

describe('property step', () => {
  it('is idempotent: a second run never creates a duplicate property', async () => {
    const beds24 = useBeds24()

    await runPropertyStep(USER_ID, createInput)
    const second = await runPropertyStep(USER_ID, createInput)

    expect(second.alreadyDone).toBe(true)
    expect(beds24.callsTo('POST', '/properties')).toHaveLength(1)
  })

  it('looks up the room ID when the create response omits it', async () => {
    useBeds24({
      'POST /properties': { body: [{ success: true, new: { id: 301 } }] },
      'GET /properties': { body: { data: [{ id: 301, roomTypes: [{ id: 777 }] }] } },
    })

    const result = await runPropertyStep(USER_ID, createInput)

    expect(result.data).toMatchObject({ propertyId: '301', roomId: '777' })
  })

  it('records a failed status so the wizard can show and retry it', async () => {
    useBeds24({ 'POST /properties': { body: [{ success: false, errors: [{ message: 'bad name' }] }] } })

    await expect(runPropertyStep(USER_ID, createInput)).rejects.toThrow(Beds24RequestError)
    expect(state().steps.property).toMatchObject({ status: 'failed', error: 'bad name' })
    expect(user().property_id).toBeNull()
  })

  it('importing from Airbnb also completes the Airbnb connection step', async () => {
    const beds24 = useBeds24({
      'GET /properties': { body: { data: [] } },
      'POST /channels/airbnb': { body: [{ success: true, propertyId: 401, roomId: 801 }] },
    })

    await runPropertyStep(USER_ID, { mode: 'importAirbnb', airbnbUserId: '111', airbnbListingId: '555', listingName: 'Loft' })

    expect(beds24.callsTo('POST', '/channels/airbnb')[0].body).toEqual([
      { action: 'importAsNewProperty', airbnbUserId: '111', airbnbListingId: '555', connect: 'full' },
    ])
    expect(user()).toMatchObject({ property_id: '401', room_id: '801:Loft' })
    expect(state().steps.airbnbConnect).toMatchObject({ status: 'done', data: { airbnbListingId: '555' } })
  })

  it('finds the imported property by diffing the account when the import response has no IDs', async () => {
    let imported = false
    useBeds24({
      'GET /properties': () => ({
        body: {
          data: [
            { id: 100, roomTypes: [{ id: 200 }] },
            ...(imported ? [{ id: 402, roomTypes: [{ id: 802 }] }] : []),
          ],
        },
      }),
      'POST /channels/airbnb': () => {
        imported = true
        return { body: [{ success: true }] }
      },
    })

    const result = await runPropertyStep(USER_ID, { mode: 'importAirbnb', airbnbUserId: '111', airbnbListingId: '555' })

    expect(result.data).toMatchObject({ propertyId: '402', roomId: '802', source: 'airbnbImport' })
    expect(user().property_id).toBe('402')
  })

  it('warns that the property may exist when the import cannot be matched', async () => {
    const beds24 = useBeds24({
      'GET /properties': { body: { data: [{ id: 100, roomTypes: [{ id: 200 }] }] } },
      'POST /channels/airbnb': { body: [{ success: true }] },
    })

    await expect(
      runPropertyStep(USER_ID, { mode: 'importAirbnb', airbnbUserId: '111', airbnbListingId: '555' }),
    ).rejects.toThrow(/בדוק ב-Beds24 לפני ניסיון חוזר/)
    expect(beds24.callsTo('POST', '/channels/airbnb')).toHaveLength(1)
    expect(user().property_id).toBeNull()
  })
})

describe('existing property in the client sub-account', () => {
  const existingInput = { mode: 'existing' as const, propertyId: '501', roomId: '901' }
  const subAccountProperties = {
    body: { data: [{ id: 501, name: 'Dalit Loft', roomTypes: [{ id: 901, name: 'Loft room' }, { id: 902 }] }] },
  }
  const syncedAirbnbSettings = {
    body: { data: [{ properties: [{ id: 501, multiplier: 1, roomTypes: [{ id: 901, airbnbListingId: '777' }] }] }] },
  }

  function useOwnTokens() {
    Object.assign(user(), { beds24_token: 'sub-a', beds24_refresh_token: 'sub-r' })
  }

  it('lists the sub-account properties with the client tokens and flags the account in the overview', async () => {
    useOwnTokens()
    const beds24 = useBeds24({ 'GET /properties': subAccountProperties })

    const properties = await getAccountPropertiesForClient(USER_ID)
    const overview = await getOnboardingOverview(USER_ID)

    expect(properties).toEqual([{
      propertyId: '501',
      name: 'Dalit Loft',
      rooms: [{ roomId: '901', name: 'Loft room' }, { roomId: '902', name: 'חדר 902' }],
    }])
    expect(beds24.calls[0].userTokens).toEqual({ accessToken: 'sub-a', refreshToken: 'sub-r' })
    expect(overview.usesOwnBeds24Account).toBe(true)
  })

  it('links the existing room without creating anything and detects the synced Airbnb listing', async () => {
    useOwnTokens()
    const beds24 = useBeds24({
      'GET /properties': subAccountProperties,
      'GET /channels/settings': syncedAirbnbSettings,
    })

    const result = await runPropertyStep(USER_ID, existingInput)

    expect(result.data).toEqual({ propertyId: '501', roomId: '901', roomName: 'Loft room', source: 'existing' })
    expect(user()).toMatchObject({ property_id: '501', room_id: '901:Loft room' })
    expect(beds24.callsTo('GET', '/properties')[0].query).toMatchObject({ id: '501' })
    expect(beds24.calls.filter((c) => c.method === 'POST')).toHaveLength(0)
    expect(state().steps.airbnbConnect).toMatchObject({
      status: 'done',
      data: { airbnbListingId: '777', detectedFromBeds24: true },
    })
  })

  it('leaves the Airbnb step open when the room is not synced', async () => {
    useBeds24({
      'GET /properties': subAccountProperties,
      'GET /channels/settings': { body: { data: [] } },
    })

    await runPropertyStep(USER_ID, existingInput)

    expect(state().steps.property?.status).toBe('done')
    expect(state().steps.airbnbConnect).toBeUndefined()
  })

  it('still links the property when the Airbnb lookup fails', async () => {
    useBeds24({ 'GET /properties': subAccountProperties })

    await runPropertyStep(USER_ID, existingInput)

    expect(state().steps.property?.status).toBe('done')
    expect(state().steps.airbnbConnect).toBeUndefined()
  })

  it('rejects a room that does not belong to the account', async () => {
    useBeds24({ 'GET /properties': subAccountProperties })

    await expect(runPropertyStep(USER_ID, { ...existingInput, roomId: '999' })).rejects.toThrow(/לא נמצאו/)
    expect(state().steps.property?.status).toBe('failed')
    expect(user().property_id).toBeNull()
  })

  it('can finalize with existing prices by skipping the base price, then apply the multiplier', async () => {
    useOwnTokens()
    const beds24 = useBeds24({
      ...happyBeds24Routes,
      'GET /properties': subAccountProperties,
      'GET /channels/settings': syncedAirbnbSettings,
    })

    await runPropertyStep(USER_ID, existingInput)
    await skipStep(USER_ID, 'basePrice')
    await runAirbnbMultiplierStep(USER_ID)
    const finalize = await runFinalizeStep(USER_ID)

    expect(state().steps.basePrice?.status).toBe('skipped')
    expect(beds24.callsTo('POST', '/inventory/rooms/calendar')).toHaveLength(0)
    expect(beds24.callsTo('POST', '/channels/settings')[0].body).toEqual([
      { channel: 'airbnb', properties: [{ id: 501, multiplier: 1.21 }] },
    ])
    expect(finalize.apiKey).toBe('hk_test_key')
    expect(user().onboarding_completed_at).toEqual(expect.any(String))
  })
})

describe('step ordering and repeats', () => {
  it('refuses steps whose prerequisites are missing', async () => {
    useBeds24()
    await expect(runBasePriceStep(USER_ID, { price: 500, minStay: 1, months: 12 })).rejects.toThrow(StepPrerequisiteError)
    await expect(runFinalizeStep(USER_ID)).rejects.toThrow(StepPrerequisiteError)
  })

  it('keeps the last successful price when a repeat fails', async () => {
    useBeds24()
    await runPropertyStep(USER_ID, createInput)
    await runBasePriceStep(USER_ID, { price: 500, minStay: 1, months: 12 })

    useBeds24({ 'POST /inventory/rooms/calendar': { body: [{ success: false, errors: [{ message: 'boom' }] }] } })
    await expect(runBasePriceStep(USER_ID, { price: 900, minStay: 1, months: 12 })).rejects.toThrow()

    expect(state().steps.basePrice).toMatchObject({ status: 'done', data: { price: 500 } })
  })

  it('returns the API key only on the first finalize', async () => {
    useBeds24()
    await runPropertyStep(USER_ID, createInput)
    await runBasePriceStep(USER_ID, { price: 500, minStay: 1, months: 12 })

    expect((await runFinalizeStep(USER_ID)).apiKey).toBe('hk_test_key')
    const again = await runFinalizeStep(USER_ID)
    expect(again).toMatchObject({ alreadyDone: true, apiKey: null })
    expect(db.__table('api_keys')).toHaveLength(1)
  })

  it('stops finalize before creating an API key when the webhook cannot be set', async () => {
    useBeds24()
    await runPropertyStep(USER_ID, createInput)
    await runBasePriceStep(USER_ID, { price: 500, minStay: 1, months: 12 })

    useBeds24({ 'POST /properties': { body: [{ success: false, errors: [{ message: 'no access' }] }] } })
    await expect(runFinalizeStep(USER_ID)).rejects.toThrow(Beds24RequestError)

    expect(db.__table('api_keys')).toHaveLength(0)
    expect(user().onboarding_completed_at ?? null).toBeNull()
  })

  it('stores a cache warning without failing finalize', async () => {
    useBeds24()
    mocks.refreshRoomCache.mockResolvedValue({ upserted: 0, error: 'Beds24 down' })
    await runPropertyStep(USER_ID, createInput)
    await runBasePriceStep(USER_ID, { price: 500, minStay: 1, months: 12 })

    const result = await runFinalizeStep(USER_ID)
    expect(result.data).toMatchObject({ cachedDays: 0, cacheWarning: 'Beds24 down' })
  })
})

describe('skipping channels', () => {
  it('skipping Airbnb also skips the multiplier and verify does not query Airbnb', async () => {
    const beds24 = useBeds24()
    await runPropertyStep(USER_ID, createInput)

    await skipStep(USER_ID, 'airbnbConnect')
    expect(state().steps.airbnbMultiplier?.status).toBe('skipped')
    await expect(runAirbnbMultiplierStep(USER_ID)).rejects.toThrow(StepPrerequisiteError)

    const verify = await runVerifyChannelsStep(USER_ID)
    expect(verify.data).toMatchObject({ airbnb: null, multiplierMatches: null })
    expect(beds24.callsTo('GET', '/channels/settings')).toHaveLength(0)
  })

  it('cannot skip a step that is already done', async () => {
    useBeds24()
    await runPropertyStep(USER_ID, createInput)
    await runBookingComStep(USER_ID, {})

    await expect(skipStep(USER_ID, 'bookingCom')).rejects.toThrow(StepPrerequisiteError)
  })

  it('flags a multiplier mismatch during verification', async () => {
    useBeds24({
      ...happyBeds24Routes,
      'GET /channels/settings': {
        body: { data: [{ properties: [{ id: 301, multiplier: 1, roomTypes: [{ id: 601, airbnbListingId: '555' }] }] }] },
      },
    })
    await runPropertyStep(USER_ID, createInput)
    await runAirbnbConnectStep(USER_ID, { airbnbUserId: '111', airbnbListingId: '555' })

    const verify = await runVerifyChannelsStep(USER_ID)
    expect(verify.data).toMatchObject({ multiplierMatches: false })
  })
})
