import { createServiceRoleClient } from '@/lib/supabase/server'
import type { CreditSnapshot } from './credits'

export interface OnboardingAuditEntry {
  userId: string
  step: string
  method: string
  path: string
  httpStatus: number | null
  success: boolean
  error?: string
  credits?: CreditSnapshot
}

/** Never throws: a failed audit write must not fail the onboarding step. */
export async function logOnboardingCall(entry: OnboardingAuditEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('onboarding_audit_log').insert({
      user_id: entry.userId,
      step: entry.step,
      method: entry.method,
      path: entry.path,
      http_status: entry.httpStatus,
      success: entry.success,
      error: entry.error ?? null,
      request_cost: entry.credits?.requestCost ?? null,
      credits_remaining: entry.credits?.remaining ?? null,
    })
    if (error) console.error('[OnboardingAudit] insert failed:', error.message)
  } catch (err) {
    console.error('[OnboardingAudit] insert threw:', err)
  }
}
