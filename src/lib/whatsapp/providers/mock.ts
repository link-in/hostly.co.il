// Mock Provider for Testing
// Use this in development/testing without sending real messages

import type { WhatsAppProvider, WhatsAppMessage, WhatsAppResponse } from '../types'

export class MockProvider implements WhatsAppProvider {
  name = 'Mock'

  validateConfig(): boolean {
    return true
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('📱 [MOCK] WhatsApp Message:')
    console.log('   To:', message.to)
    console.log('   Message:', message.message)
    if (message.image) console.log('   Image:', message.image)
    if (message.document) console.log('   Document:', message.document)

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      provider: 'mock',
    }
  }
}
