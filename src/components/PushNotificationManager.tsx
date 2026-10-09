'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff } from 'lucide-react'

// You must expose the public VAPID key to the client
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

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if push messaging is supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (e) {
      console.error('Error checking subscription', e)
    }
  }

  const handleSubscribe = async () => {
    if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      toast.error('התראות פוש לא מוגדרות במערכת (VAPID key חסר)')
      return
    }

    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('יש לאשר קבלת התראות בדפדפן כדי להמשיך')
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      })

      // Send to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      if (!res.ok) throw new Error('Failed to save subscription')

      setIsSubscribed(true)
      toast.success('מעולה! עכשיו תקבל התראות לטלפון כשיש הזמנות חדשות')
    } catch (err: any) {
      console.error('Error subscribing:', err)
      toast.error('רישום להתראות נכשל: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        // Delete from server first
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        
        // Then unsubscribe in browser
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
      toast.info('התראות הופסקו למכשיר זה')
    } catch (err: any) {
      console.error('Error unsubscribing:', err)
      toast.error('ביטול התראות נכשל')
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) return null

  return (
    <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
      <div className="card-body p-3 p-md-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <div 
            className="d-flex align-items-center justify-content-center" 
            style={{ 
              width: '40px', height: '40px', borderRadius: '50%',
              background: isSubscribed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(113, 51, 217, 0.1)'
            }}
          >
            {isSubscribed ? <Bell size={20} color="#10B981" /> : <BellOff size={20} color="#7133D9" />}
          </div>
          <div>
            <h6 className="mb-0 fw-bold">התראות למכשיר (Push Notifications)</h6>
            <div className="small text-muted mt-1">
              {isSubscribed 
                ? 'המכשיר הזה יקבל התראות על הזמנות ובקשות חדשות' 
                : 'קבל התראה קופצת למסך כשיש הזמנה חדשה (מומלץ)'}
            </div>
          </div>
        </div>
        
        <button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading}
          className={`btn btn-sm ${isSubscribed ? 'btn-outline-secondary' : 'btn-primary'}`}
          style={{ borderRadius: '8px' }}
        >
          {loading ? 'טוען...' : isSubscribed ? 'בטל התראות' : 'הפעל התראות'}
        </button>
      </div>
    </div>
  )
}
