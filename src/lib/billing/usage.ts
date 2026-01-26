import { createServerClient } from '@/lib/supabase/server'

/**
 * Track usage for billing purposes
 */

export async function incrementWhatsAppUsage(userId: string, success: boolean) {
  try {
    const supabase = createServerClient()
    
    // Call Supabase function to increment usage
    const { error } = await supabase.rpc('increment_usage', {
      p_user_id: userId,
      p_whatsapp_sent: success ? 1 : 0,
      p_whatsapp_failed: success ? 0 : 1,
      p_bookings_created: 0,
      p_api_calls: 0,
    })

    if (error) {
      console.error('Failed to increment WhatsApp usage:', error)
    }
  } catch (error) {
    console.error('Error tracking WhatsApp usage:', error)
  }
}

export async function incrementBookingUsage(userId: string) {
  try {
    const supabase = createServerClient()
    
    const { error } = await supabase.rpc('increment_usage', {
      p_user_id: userId,
      p_whatsapp_sent: 0,
      p_whatsapp_failed: 0,
      p_bookings_created: 1,
      p_api_calls: 0,
    })

    if (error) {
      console.error('Failed to increment booking usage:', error)
    }
  } catch (error) {
    console.error('Error tracking booking usage:', error)
  }
}

export async function checkUserLimits(userId: string): Promise<{
  hasActiveSubscription: boolean
  canSendWhatsApp: boolean
  planName?: string
  whatsappUsed?: number
  whatsappLimit?: number
  whatsappRemaining?: number
}> {
  try {
    const supabase = createServerClient()
    
    const { data, error } = await supabase.rpc('check_user_limits', {
      p_user_id: userId,
    })

    if (error) {
      console.error('Failed to check user limits:', error)
      return { hasActiveSubscription: false, canSendWhatsApp: false }
    }

    return data || { hasActiveSubscription: false, canSendWhatsApp: false }
  } catch (error) {
    console.error('Error checking user limits:', error)
    return { hasActiveSubscription: false, canSendWhatsApp: false }
  }
}
