// WhatsApp Service Types
// This abstraction allows easy switching between providers (UltraMsg, WAHA, Whapi, etc.)

export interface WhatsAppMessage {
  to: string // Phone number with country code (e.g., "+972501234567")
  message: string
  // Optional fields for future enhancements
  image?: string
  document?: string
  caption?: string
}

export interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
  provider: string // Which provider was used (ultramsg, waha, whapi)
}

export interface WhatsAppProvider {
  name: string
  sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse>
  validateConfig(): boolean
}

export type WhatsAppProviderType = 'whapi' | 'waha' | 'mock'

/** Optional metadata attached to a send for the central whatsapp_messages_log. */
export interface WhatsAppSendMeta {
  userId?: string | null
  bookingId?: string | number | null
  messageType?:
    | 'new_booking_guest'
    | 'new_booking_owner'
    | 'cancellation_owner'
    | 'booking_request_owner'
    | 'inquiry_owner'
    | 'check_in_guest'
    | 'check_in_owner'
    | 'review_reminder_guest'
    | 'review_reminder_test'
    | 'public_booking_owner'
    | 'manual_booking_guest'
    | 'other'
  recipientRole?: 'guest' | 'owner' | 'other'
  recipientName?: string | null
}
