// WhatsApp Service - Main Entry Point
// Simple API for sending WhatsApp messages

import { getWhatsAppProvider } from './factory'
import { insertWhatsAppMessageLog } from '@/lib/db/whatsappMessages'
import type { WhatsAppMessage, WhatsAppResponse, WhatsAppSendMeta } from './types'

/**
 * Send a WhatsApp message.
 * Automatically uses the configured provider (Whapi, WAHA, or Mock).
 * When `meta` is provided, a row is written to `whatsapp_messages_log`.
 */
export async function sendWhatsAppMessage(
  message: WhatsAppMessage,
  meta?: WhatsAppSendMeta,
): Promise<WhatsAppResponse> {
  const provider = getWhatsAppProvider()

  console.log(`📱 Sending WhatsApp via ${provider.name}...`)

  const result = await provider.sendMessage(message)

  if (result.success) {
    console.log(`✅ WhatsApp sent successfully (${result.provider})`)
  } else {
    console.error(`❌ WhatsApp failed (${result.provider}):`, result.error)
  }

  if (meta) {
    await insertWhatsAppMessageLog({
      userId: meta.userId,
      bookingId: meta.bookingId,
      messageType: meta.messageType ?? 'other',
      recipientRole: meta.recipientRole ?? 'other',
      recipientPhone: message.to,
      recipientName: meta.recipientName,
      messageBody: message.message,
      status: result.success ? 'sent' : 'failed',
      provider: result.provider,
      providerMessageId: result.messageId ?? null,
      error: result.error ?? null,
    })
  }

  return result
}

// Re-export types for convenience
export type { WhatsAppMessage, WhatsAppResponse, WhatsAppProvider, WhatsAppSendMeta } from './types'
