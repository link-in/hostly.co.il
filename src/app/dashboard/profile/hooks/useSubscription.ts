'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  SubscriptionBillingCycle,
  SubscriptionStatusValue,
} from '@/lib/profile/subscriptionView'

export interface SubscriptionInfo {
  status: SubscriptionStatusValue
  planId: string | null
  billingCycle: SubscriptionBillingCycle | null
  daysRemaining: number
  expiresAt: string | null
}

export function useSubscription(enabled: boolean) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [cancelling, setCancelling] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    fetch('/api/dashboard/subscription')
      .then((r) => r.json())
      .then((data) => setSubscription(data))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false))
  }, [enabled])

  const cancel = useCallback(async () => {
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/subscription', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ביטול נכשל')
      setSubscription((prev) => (prev ? { ...prev, status: 'cancelled' } : prev))
      setConfirmingCancel(false)
      setMessage('המנוי בוטל בהצלחה. תוכל להמשיך להשתמש במערכת עד תאריך הפקיעה.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ביטול נכשל')
    } finally {
      setCancelling(false)
    }
  }, [])

  return {
    subscription,
    loading,
    cancelling,
    confirmingCancel,
    message,
    error,
    askToCancel: () => setConfirmingCancel(true),
    dismissCancel: () => setConfirmingCancel(false),
    cancel,
  }
}
