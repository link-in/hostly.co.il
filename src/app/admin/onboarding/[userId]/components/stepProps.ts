import type { StepRecord } from '@/lib/onboarding/state'
import type { OnboardingApi, OnboardingOverview } from '../onboardingApi'
import type { StepStatus } from './stepMeta'

export interface StepProps {
  api: OnboardingApi
  overview: OnboardingOverview
  record: StepRecord | undefined
  status: StepStatus
  onChanged: () => Promise<void>
}

export function readData<T>(record: StepRecord | undefined): Partial<T> {
  return (record?.status === 'done' ? record.data : undefined) as Partial<T> ?? {}
}
