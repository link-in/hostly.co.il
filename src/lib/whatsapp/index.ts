// WhatsApp Service - Main Entry Point
// Simple API for sending WhatsApp messages

import { getWhatsAppProvider } from './factory'
import type { WhatsAppMessage, WhatsAppResponse } from './types'

/**
 * Send a WhatsApp message
 * Automatically uses the configured provider (Whapi, WAHA, or Mock)
 */
export async function sendWhatsAppMessage(
  message: WhatsAppMessage
): Promise<WhatsAppResponse> {
  const provider = getWhatsAppProvider()
  
  console.log(`📱 Sending WhatsApp via ${provider.name}...`)
  
  const result = await provider.sendMessage(message)
  
  if (result.success) {
    console.log(`✅ WhatsApp sent successfully (${result.provider})`)
  } else {
    console.error(`❌ WhatsApp failed (${result.provider}):`, result.error)
  }
  
  return result
}

// Re-export types for convenience
export type { WhatsAppMessage, WhatsAppResponse, WhatsAppProvider } from './types'
