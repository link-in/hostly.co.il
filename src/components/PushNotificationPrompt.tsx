'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { X, BellRing } from 'lucide-react'

// Same VAPID config and base64 helper as PushNotificationManager
const NEXT_PUBLIC_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

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

export function PushNotificationPrompt() {
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Don't show if push isn't supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    // Don't show if user already dismissed it
    if (localStorage.getItem('hide_push_prompt') === 'true') {
      return
    }

    const checkStatus = async () => {
      // Don't show if permission is denied
      if (Notification.permission === 'denied') return

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        
        // Show prompt only if they haven't subscribed yet
        if (!subscription) {
          setIsVisible(true)
        }
      } catch (error) {
        console.error('Error checking subscription status:', error)
      }
    }

    checkStatus()
  }, [])

  const dismiss = () => {
    localStorage.setItem('hide_push_prompt', 'true')
    setIsVisible(false)
  }

  const handleSubscribe = async () => {
    if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      toast.error('התראות פוש לא מוגדרות במערכת')
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
        
        toast.success('התראות פוש הופעלו בהצלחה!')
        setIsVisible(false) // Auto dismiss on success
      } else {
        toast.error('לא ניתן אישור להציג התראות')
        dismiss() // Dismiss if they denied permission
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error('אירעה שגיאה בהפעלת התראות פוש')
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:right-auto md:left-8 md:bottom-8 md:w-96 shadow-lg rounded-2xl bg-white border border-gray-200 p-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
          <BellRing className="w-5 h-5" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            הפעל התראות פוש
          </h3>
          <p className="text-sm text-gray-500 mb-3 leading-relaxed">
            קבל התראות מיידיות למכשיר שלך על הזמנות חדשות ובקשות אישור, כדי שתוכל להגיב מהר יותר.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : null}
              הפעל עכשיו
            </button>
            <button
              onClick={dismiss}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              לא כרגע
            </button>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-500 transition-colors"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}