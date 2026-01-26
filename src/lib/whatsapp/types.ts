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

export type WhatsAppProviderType = 'ultramsg' | 'waha' | 'whapi' | 'mock'
