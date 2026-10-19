import { buildAirbnbOAuthUrl } from '@/lib/beds24/airbnbOAuth'
import { AIRBNB_PRICE_MULTIPLIER } from './constants'
import { getLastCreditSnapshot, type CreditSnapshot } from './credits'
import { StepPrerequisiteError } from './errors'
import type {
  AirbnbConnectStepInput,
  BasePriceStepInput,
  BookingComStepInput,
  PropertyStepInput,
} from './schemas'
import {
  getOnboardingClient,
  getStepData,
  markOnboardingCompleted,
  ONBOARDING_STEPS,
  runOnboardingStep,
  saveStepRecord,
  skipOnboardingStep,
  type OnboardingClient,
  type OnboardingStepId,
  type SkippableStepId,
} from './state'
import type { OnboardingCallContext } from './beds24Client'
import { resolveBeds24Tokens } from './tokens'
import {
  createPropertyWithRoom,
  getExistingPropertyRoom,
  listProperties,
  type PropertySummary,
} from './steps/property'
import { setBasePrice } from './steps/pricing'
import {
  connectAirbnbListing,
  importAirbnbListing,
  listAirbnbListings,
  listAirbnbUsers,
  setAirbnbMultiplier,
  type AirbnbListingSummary,
  type AirbnbUserSummary,
} from './steps/airbnb'
import { getAccountChannelLinks, getAirbnbRoomStatus } from './steps/channels'
import { createCalendarApiKey, saveUserPropertyRoom, seedClientCache } from './steps/clientRecords'

const PROPERTY_SOURCE = {
  create: 'created',
  importAirbnb: 'airbnbImport',
  existing: 'existing',
} as const satisfies Record<PropertyStepInput['mode'], string>

export interface PropertyStepData extends Record<string, unknown> {
  propertyId: string
  roomId: string
  roomName: string
  source: (typeof PROPERTY_SOURCE)[keyof typeof PROPERTY_SOURCE]
}

export interface OnboardingOverview {
  client: Omit<OnboardingClient, 'state'>
  steps: OnboardingClient['state']['steps']
  stepOrder: readonly OnboardingStepId[]
  airbnbAuthUrl: string
  airbnbMultiplier: number
  credits: CreditSnapshot | null
  /** True when the client has their own Beds24 (sub-)account tokens instead of the master account. */
  usesOwnBeds24Account: boolean
}

function requirePropertyData(client: OnboardingClient): PropertyStepData {
  const data = getStepData<PropertyStepData>(client.state, 'property')
  if (!data) throw new StepPrerequisiteError('יש ליצור נכס וחדר קודם')
  return data
}

export async function getOnboardingOverview(userId: string): Promise<OnboardingOverview> {
  const { state, ...client } = await getOnboardingClient(userId)
  return {
    client,
    steps: state.steps,
    stepOrder: ONBOARDING_STEPS,
    airbnbAuthUrl: buildAirbnbOAuthUrl(client.propertyId ?? undefined),
    airbnbMultiplier: AIRBNB_PRICE_MULTIPLIER,
    credits: getLastCreditSnapshot(),
    usesOwnBeds24Account: (await resolveBeds24Tokens(userId)) !== undefined,
  }
}

export async function getAccountPropertiesForClient(userId: string): Promise<PropertySummary[]> {
  return listProperties({ userId, step: 'property' })
}

async function resolvePropertyRoom(ctx: OnboardingCallContext, input: PropertyStepInput) {
  switch (input.mode) {
    case 'create':
      return { ...(await createPropertyWithRoom(ctx, input)), roomName: input.name }
    case 'importAirbnb':
      return { ...(await importAirbnbListing(ctx, input)), roomName: input.listingName ?? '' }
    case 'existing':
      return getExistingPropertyRoom(ctx, input.propertyId, input.roomId)
  }
}

async function markAirbnbConnectedFromImport(userId: string, input: Extract<PropertyStepInput, { mode: 'importAirbnb' }>) {
  await saveStepRecord(userId, 'airbnbConnect', {
    status: 'done',
    data: {
      airbnbUserId: input.airbnbUserId,
      airbnbListingId: input.airbnbListingId,
      listingName: input.listingName ?? null,
    },
  })
}

/** Best-effort: a failed channel lookup must not undo a property link that already succeeded. */
async function markAirbnbConnectedIfDetected(userId: string, data: PropertyStepData) {
  try {
    const status = await getAirbnbRoomStatus({ userId, step: 'property' }, data.propertyId, data.roomId)
    if (!status.connected) return
    await saveStepRecord(userId, 'airbnbConnect', {
      status: 'done',
      data: { airbnbUserId: null, airbnbListingId: status.airbnbListingId, listingName: null, detectedFromBeds24: true },
    })
  } catch (err) {
    console.warn('[onboarding] Airbnb detection for existing property failed:', err)
  }
}

export async function runPropertyStep(userId: string, input: PropertyStepInput) {
  const ctx = { userId, step: 'property' }

  const result = await runOnboardingStep<PropertyStepData>(userId, 'property', async () => {
    const { propertyId, roomId, roomName } = await resolvePropertyRoom(ctx, input)
    await saveUserPropertyRoom(userId, propertyId, roomId, roomName || undefined)
    return { propertyId, roomId, roomName, source: PROPERTY_SOURCE[input.mode] }
  })

  if (!result.alreadyDone) {
    if (input.mode === 'importAirbnb') await markAirbnbConnectedFromImport(userId, input)
    if (input.mode === 'existing') await markAirbnbConnectedIfDetected(userId, result.data)
  }
  return result
}

export async function runBasePriceStep(userId: string, input: BasePriceStepInput) {
  const client = await getOnboardingClient(userId)
  const { roomId } = requirePropertyData(client)
  return runOnboardingStep(userId, 'basePrice', () =>
    setBasePrice({ userId, step: 'basePrice' }, { roomId, ...input }),
  )
}

export async function getAirbnbUsersForClient(userId: string): Promise<AirbnbUserSummary[]> {
  return listAirbnbUsers({ userId, step: 'airbnbConnect' })
}

export async function getAirbnbListingsForClient(
  userId: string,
  airbnbUserId: string,
): Promise<AirbnbListingSummary[]> {
  return listAirbnbListings({ userId, step: 'airbnbConnect' }, airbnbUserId)
}

export async function runAirbnbConnectStep(userId: string, input: AirbnbConnectStepInput) {
  const client = await getOnboardingClient(userId)
  const { roomId } = requirePropertyData(client)
  return runOnboardingStep(userId, 'airbnbConnect', async () => {
    await connectAirbnbListing({ userId, step: 'airbnbConnect' }, input, roomId)
    return {
      airbnbUserId: input.airbnbUserId,
      airbnbListingId: input.airbnbListingId,
      listingName: input.listingName ?? null,
    }
  })
}

export async function runAirbnbMultiplierStep(userId: string) {
  const client = await getOnboardingClient(userId)
  const { propertyId } = requirePropertyData(client)
  if (client.state.steps.airbnbConnect?.status !== 'done') {
    throw new StepPrerequisiteError('יש לחבר מודעת Airbnb לפני קביעת המכפיל')
  }
  return runOnboardingStep(userId, 'airbnbMultiplier', async () => {
    await setAirbnbMultiplier({ userId, step: 'airbnbMultiplier' }, propertyId, AIRBNB_PRICE_MULTIPLIER)
    return { multiplier: AIRBNB_PRICE_MULTIPLIER }
  })
}

export async function runBookingComStep(userId: string, input: BookingComStepInput) {
  return runOnboardingStep(userId, 'bookingCom', async () => ({
    hotelId: input.hotelId || null,
    confirmedAt: new Date().toISOString(),
  }))
}

export async function runVerifyChannelsStep(userId: string) {
  const client = await getOnboardingClient(userId)
  const { propertyId, roomId } = requirePropertyData(client)
  const ctx = { userId, step: 'verifyChannels' }
  const expectsAirbnb = client.state.steps.airbnbConnect?.status === 'done'

  return runOnboardingStep(userId, 'verifyChannels', async () => {
    const airbnb = expectsAirbnb ? await getAirbnbRoomStatus(ctx, propertyId, roomId) : null
    const accountLinks = await getAccountChannelLinks(ctx)
    return {
      airbnb,
      multiplierMatches: airbnb ? airbnb.multiplier === AIRBNB_PRICE_MULTIPLIER : null,
      accountLinks,
      checkedAt: new Date().toISOString(),
    }
  })
}

export async function runFinalizeStep(userId: string) {
  const client = await getOnboardingClient(userId)
  const { propertyId, roomId } = requirePropertyData(client)
  let apiKey: string | null = null

  const result = await runOnboardingStep(userId, 'finalize', async () => {
    const cache = await seedClientCache(userId, propertyId, roomId)
    apiKey = await createCalendarApiKey(userId, roomId)
    await markOnboardingCompleted(userId)
    return { cachedDays: cache.upserted, cacheWarning: cache.warning, apiKeyCreated: true }
  })

  return { ...result, apiKey }
}

export async function skipStep(userId: string, stepId: SkippableStepId) {
  return skipOnboardingStep(userId, stepId)
}
