// UltraMsg Provider Implementation
// Docs: https://docs.ultramsg.com/

import type { WhatsAppProvider, WhatsAppMessage, WhatsAppResponse } from '../types'

export class UltraMsgProvider implements WhatsAppProvider {
  name = 'UltraMsg'
  private instanceId: string
  private token: string
  private baseUrl: string

  constructor() {
    this.instanceId = process.env.ULTRAMSG_INSTANCE_ID || ''
    this.token = process.env.ULTRAMSG_TOKEN || ''
    this.baseUrl = `https://api.ultramsg.com/${this.instanceId}`
  }

  validateConfig(): boolean {
    return !!(this.instanceId && this.token)
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    if (!this.validateConfig()) {
      return {
        success: false,
        error: 'UltraMsg configuration missing (ULTRAMSG_INSTANCE_ID or ULTRAMSG_TOKEN)',
        provider: 'ultramsg',
      }
    }

    try {
      const url = `${this.baseUrl}/messages/chat`
      
      const body = {
        token: this.token,
        to: message.to,
        body: message.message,
        // Optional fields
        ...(message.image && { image: message.image }),
        ...(message.document && { document: message.document }),
        ...(message.caption && { caption: message.caption }),
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          provider: 'ultramsg',
        }
      }

      // UltraMsg successful response structure
      if (data.sent === 'true' || data.sent === true) {
        return {
          success: true,
          messageId: data.id || data.chatId,
          provider: 'ultramsg',
        }
      }

      return {
        success: false,
        error: data.error || 'Unknown error from UltraMsg',
        provider: 'ultramsg',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: 'ultramsg',
      }
    }
  }
}
