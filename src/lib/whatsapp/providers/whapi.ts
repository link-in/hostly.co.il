// Whapi Provider Implementation
// Docs: https://whapi.cloud/docs

import type { WhatsAppProvider, WhatsAppMessage, WhatsAppResponse } from '../types'

export class WhapiProvider implements WhatsAppProvider {
  name = 'Whapi'
  private token: string
  private baseUrl: string

  constructor() {
    this.token = process.env.WHAPI_TOKEN || ''
    this.baseUrl = process.env.WHAPI_BASE_URL || 'https://gate.whapi.cloud'
  }

  validateConfig(): boolean {
    return !!this.token
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    if (!this.validateConfig()) {
      return {
        success: false,
        error: 'Whapi configuration missing (WHAPI_TOKEN)',
        provider: 'whapi',
      }
    }

    try {
      // Whapi requires phone number WITHOUT the + sign
      const phoneNumber = message.to.replace(/^\+/, '')
      
      const url = `${this.baseUrl}/messages/text`
      
      const body: any = {
        typing_time: 0,
        to: phoneNumber,
        body: message.message,
      }

      // Handle image messages
      if (message.image) {
        const imageUrl = `${this.baseUrl}/messages/image`
        const imageBody = {
          typing_time: 0,
          to: phoneNumber,
          media: message.image,
          caption: message.caption || message.message,
        }

        const response = await fetch(imageUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(imageBody),
        })

        const data = await response.json()

        if (!response.ok) {
          return {
            success: false,
            error: data.message || `HTTP ${response.status}: ${response.statusText}`,
            provider: 'whapi',
          }
        }

        return {
          success: true,
          messageId: data.message_id || data.id,
          provider: 'whapi',
        }
      }

      // Handle document messages
      if (message.document) {
        const docUrl = `${this.baseUrl}/messages/document`
        const docBody = {
          typing_time: 0,
          to: phoneNumber,
          media: message.document,
          caption: message.caption,
        }

        const response = await fetch(docUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(docBody),
        })

        const data = await response.json()

        if (!response.ok) {
          return {
            success: false,
            error: data.message || `HTTP ${response.status}: ${response.statusText}`,
            provider: 'whapi',
          }
        }

        return {
          success: true,
          messageId: data.message_id || data.id,
          provider: 'whapi',
        }
      }

      // Standard text message
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
          provider: 'whapi',
        }
      }

      // Whapi successful response
      return {
        success: true,
        messageId: data.message_id || data.id,
        provider: 'whapi',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: 'whapi',
      }
    }
  }
}
