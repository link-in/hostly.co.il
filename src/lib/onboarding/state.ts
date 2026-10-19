import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { OnboardingError, OnboardingNotFoundError, StepPrerequisiteError } from './errors'

export const ONBOARDING_STEPS = [
  'property',
  'basePrice',
  'airbnbConnect',
  'airbnbMultiplier',
  'bookingCom',
  'verifyChannels',
  'finalize',
] as const
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]

export const SKIPPABLE_STEPS = ['basePrice', 'airbnbConnect', 'airbnbMultiplier', 'bookingCom'] as const
export type SkippableStepId = (typeof SKIPPABLE_STEPS)[number]

/** Steps that can safely be re-run after success (they overwrite, never duplicate). */
const REPEATABLE_STEPS: ReadonlySet<OnboardingStepId> = new Set([
  'basePrice',
  'airbnbMultiplier',
  'bookingCom',
  'verifyChannels',
])

const PREREQUISITES: Record<OnboardingStepId, OnboardingStepId[]> = {
  property: [],
  basePrice: ['property'],
  airbnbConnect: ['property'],
  airbnbMultiplier: ['airbnbConnect'],
  bookingCom: ['property'],
  verifyChannels: ['property'],
  finalize: ['property', 'basePrice'],
}

const stepRecordSchema = z.object({
  status: z.enum(['done', 'failed', 'skipped']),
  data: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  updatedAt: z.string(),
})
export type StepRecord = z.infer<typeof stepRecordSchema>

const onboardingStateSchema = z.object({
  steps: z.partialRecord(z.enum(ONBOARDING_STEPS), stepRecordSchema).default({}),
})
export type OnboardingState = z.infer<typeof onboardingStateSchema>

export interface OnboardingClient {
  id: string
  email: string
  displayName: string
  propertyId: string | null
  roomId: string | null
  completedAt: string | null
  state: OnboardingState
}

export function parseOnboardingState(raw: unknown): OnboardingState {
  const parsed = onboardingStateSchema.safeParse(raw ?? {})
  return parsed.success ? parsed.data : { steps: {} }
}

export async function getOnboardingClient(userId: string): Promise<OnboardingClient> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name, property_id, room_id, onboarding_state, onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new OnboardingError(`שגיאה בטעינת המשתמש: ${error.message}`, 500)
  if (!data) throw new OnboardingNotFoundError('המשתמש לא נמצא')

  const row = data as Record<string, unknown>
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    displayName: String(row.display_name ?? ''),
    propertyId: (row.property_id as string | null) || null,
    roomId: (row.room_id as string | null) || null,
    completedAt: (row.onboarding_completed_at as string | null) ?? null,
    state: parseOnboardingState(row.onboarding_state),
  }
}

export async function saveStepRecord(
  userId: string,
  stepId: OnboardingStepId,
  record: Omit<StepRecord, 'updatedAt'>,
): Promise<OnboardingState> {
  const client = await getOnboardingClient(userId)
  const nextState: OnboardingState = {
    steps: { ...client.state.steps, [stepId]: { ...record, updatedAt: new Date().toISOString() } },
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('users')
    .update({ onboarding_state: nextState })
    .eq('id', userId)

  if (error) throw new OnboardingError(`שגיאה בשמירת סטטוס הקליטה: ${error.message}`, 500)
  return nextState
}

export function isStepSatisfied(state: OnboardingState, stepId: OnboardingStepId): boolean {
  const status = state.steps[stepId]?.status
  return status === 'done' || status === 'skipped'
}

export function assertPrerequisites(state: OnboardingState, stepId: OnboardingStepId): void {
  const missing = PREREQUISITES[stepId].filter((dep) => !isStepSatisfied(state, dep))
  if (missing.length) {
    throw new StepPrerequisiteError(`יש להשלים קודם את השלבים: ${missing.join(', ')}`)
  }
}

export function getStepData<T extends Record<string, unknown>>(
  state: OnboardingState,
  stepId: OnboardingStepId,
): T | undefined {
  const record = state.steps[stepId]
  return record?.status === 'done' ? (record.data as T | undefined) : undefined
}

/**
 * Runs a step at most once (unless repeatable), persisting success or failure
 * so the wizard can resume after an interruption.
 */
export async function runOnboardingStep<T extends Record<string, unknown>>(
  userId: string,
  stepId: OnboardingStepId,
  action: (state: OnboardingState) => Promise<T>,
): Promise<{ data: T; alreadyDone: boolean }> {
  const { state } = await getOnboardingClient(userId)
  assertPrerequisites(state, stepId)

  const existing = getStepData<T>(state, stepId)
  if (existing && !REPEATABLE_STEPS.has(stepId)) {
    return { data: existing, alreadyDone: true }
  }

  try {
    const data = await action(state)
    await saveStepRecord(userId, stepId, { status: 'done', data })
    return { data, alreadyDone: false }
  } catch (err) {
    // A failed re-run of a repeatable step keeps the last successful result.
    if (!existing) {
      const message = err instanceof Error ? err.message : String(err)
      await saveStepRecord(userId, stepId, { status: 'failed', error: message }).catch(() => undefined)
    }
    throw err
  }
}

export async function skipOnboardingStep(userId: string, stepId: SkippableStepId): Promise<OnboardingState> {
  const { state } = await getOnboardingClient(userId)
  assertPrerequisites(state, stepId)
  if (state.steps[stepId]?.status === 'done') {
    throw new StepPrerequisiteError('לא ניתן לדלג על שלב שכבר הושלם')
  }

  const nextState = await saveStepRecord(userId, stepId, { status: 'skipped' })
  if (stepId === 'airbnbConnect') {
    return saveStepRecord(userId, 'airbnbMultiplier', { status: 'skipped' })
  }
  return nextState
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw new OnboardingError(`שגיאה בסימון סיום הקליטה: ${error.message}`, 500)
}
