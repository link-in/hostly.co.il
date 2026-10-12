'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { X, BellRing } from 'lucide-react'
import { QA_PUSH_TEST_PARAM, isPushQaTestActive } from '@/lib/push/qaTest'
import styles from './PushNotificationPrompt.module.css'

// Same VAPID config and base64 helper as PushNotificationManager
const NEXT_PUBLIC_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

// Admin-only QA mode (?test_push=1) — see src/lib/push/qaTest.ts

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function triggerQaTestBookingPush() {
  try {
    const res = await fetch('/api/push/test-booking', { method: 'POST' })
    const data = await res.json()
    if (data?.sent > 0) {
      toast.success('🔔 נשלחה התראת בדיקה (הזמנה מדומה) - בדוק את הטלפון')
    } else {
      toast.info('לא נמצא רישום להתראות במכשיר הזה - אשר קודם את הפופאפ')
    }
  } catch (error) {
    console.error('QA test push failed:', error)
  }
}

export function PushNotificationPrompt() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isQaPushTest = isPushQaTestActive(
    searchParams.get(QA_PUSH_TEST_PARAM),
    session?.user?.role,
  )

  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Don't show if push isn't supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    // Don't show if user already dismissed it — unless we're in QA test mode
    if (!isQaPushTest && localStorage.getItem('hide_push_prompt') === 'true') {
      return
    }

    const checkStatus = async () => {
      // Don't show if permission is denied — unless we're in QA test mode
      // (the native browser dialog still won't reopen on its own, but the
      // card itself can reappear so a tester notices and fixes it manually)
      if (!isQaPushTest && Notification.permission === 'denied') return

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          // Show prompt only if they haven't subscribed yet
          setIsVisible(true)
        } else if (isQaPushTest) {
          // Already subscribed on this device — simulate an incoming booking push
          triggerQaTestBookingPush()
        }
      } catch (error) {
        console.error('Error checking subscription status:', error)
      }
    }

    checkStatus()
  }, [isQaPushTest])

  const dismiss = () => {
    // Don't persist the "hide" flag while QA testing, so normal behaviour
    // for the real user isn't permanently affected by a test visit.
    if (!isQaPushTest) {
      localStorage.setItem('hide_push_prompt', 'true')
    }
    setIsVisible(false)
  }

  const handleSubscribe = async () => {
    if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      toast.error('התראות לא מוגדרות במערכת')
      return
    }

    if (Notification.permission === 'denied') {
      toast.error('ההתראות חסומות בדפדפן. יש לאפס את הרשאות ההתראות לאתר (לחיצה על המנעול בשורת הכתובת ← Notifications) ולנסות שוב.')
      return
    }

    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        })

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        })

        if (!res.ok) throw new Error('Failed to save subscription on server')

        toast.success('התראות הופעלו בהצלחה!')
        setIsVisible(false) // Auto dismiss on success

        if (isQaPushTest) {
          // Fire the fake booking push right away now that we're subscribed
          triggerQaTestBookingPush()
        }
      } else {
        toast.error('לא ניתן אישור להציג התראות')
        dismiss() // Dismiss if they denied permission
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error('אירעה שגיאה בהפעלת התראות')
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className={styles.card} role="dialog" aria-label="הפעלת התראות">
      <div className={styles.row}>
        <div className={styles.iconWrap}>
          <BellRing size={20} />
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>הפעל התראות</h3>
          <p className={styles.text}>
            קבל התראות מיידיות למכשיר שלך על הזמנות חדשות ובקשות אישור, כדי שתוכל להגיב מהר יותר.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {loading ? <span className={styles.spinner} /> : null}
              הפעל עכשיו
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={loading}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              לא כרגע
            </button>
          </div>
        </div>

        <button type="button" onClick={dismiss} className={styles.close} aria-label="סגור">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
