import webpush from 'web-push'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface PushPayload {
  title: string
  body: string
  url?: string
}

let configured = false

function configureWebPush() {
  if (configured) return true
  
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  
  if (!publicKey || !privateKey) {
    console.warn('⚠️ Web Push VAPID keys not configured')
    return false
  }
  
  // You must provide a subject (a URL or a mailto: email address)
  webpush.setVapidDetails(
    'mailto:support@hostly.co.il',
    publicKey,
    privateKey
  )
  configured = true
  return true
}

/**
 * Send a web push notification to a specific user.
 * It fetches all their active subscriptions and sends to all devices.
 */
export async function sendPushNotification(userId: string, payload: PushPayload) {
  if (!configureWebPush()) return { success: false, error: 'Web push not configured' }

  try {
    const supabase = createServiceRoleClient()
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to fetch push subscriptions:', error)
      return { success: false, error: 'Database error' }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sent: 0, reason: 'No active subscriptions' }
    }

    const payloadString = JSON.stringify(payload)
    const promises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }
      try {
        await webpush.sendNotification(pushSubscription, payloadString)
        return { success: true }
      } catch (err: any) {
        console.error('Push send error:', err)
        // If the subscription is invalid/expired (HTTP 410 or 404), remove it from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
        return { success: false, error: err.message }
      }
    })

    const results = await Promise.all(promises)
    const sentCount = results.filter(r => r.success).length

    return { success: true, sent: sentCount, total: subscriptions.length }
  } catch (err: any) {
    console.error('sendPushNotification error:', err)
    return { success: false, error: err.message }
  }
}