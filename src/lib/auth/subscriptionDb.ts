import { createServiceRoleClient } from '@/lib/supabase/server'
import type { SubscriptionStatus } from './types'

export interface Subscription {
  id: string
  user_id: string
  plan_id: string | null
  status: SubscriptionStatus
  billing_cycle: 'monthly' | 'annual' | null
  started_at: string
  expires_at: string | null
  cancelled_at: string | null
  auto_renew: boolean
}

/**
 * Returns the most relevant active subscription for a user.
 * Priority: active > trial > cancelled (still valid) > expired
 */
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch subscription:', error)
      return null
    }

    return data as Subscription | null
  } catch (err) {
    console.error('getActiveSubscription error:', err)
    return null
  }
}

/**
 * Creates a 14-day trial subscription for a newly registered user.
 */
export async function createTrialSubscription(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_id: null,
      status: 'trial',
      billing_cycle: 'monthly',
      started_at: new Date().toISOString(),
      expires_at: trialEndsAt.toISOString(),
      auto_renew: false,
    })

    if (error) {
      console.error('Failed to create trial subscription:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('createTrialSubscription error:', err)
    return false
  }
}

/**
 * Activates a paid subscription for a user after payment.
 */
export async function activateSubscription(
  userId: string,
  planId: 'monthly' | 'annual',
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()

    const now = new Date()
    const expiresAt = new Date(now)
    if (planId === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    }

    // Cancel any existing subscriptions first
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: now.toISOString() })
      .eq('user_id', userId)
      .in('status', ['trial', 'active'])

    // Create new active subscription
    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      billing_cycle: planId,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      auto_renew: true,
    })

    if (error) {
      console.error('Failed to activate subscription:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('activateSubscription error:', err)
    return false
  }
}

/**
 * Cancels a user's active subscription (keeps access until expires_at).
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        auto_renew: false,
      })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) {
      console.error('Failed to cancel subscription:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('cancelSubscription error:', err)
    return false
  }
}

/**
 * Returns days remaining in trial/subscription. Negative = expired.
 */
export function getDaysRemaining(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
