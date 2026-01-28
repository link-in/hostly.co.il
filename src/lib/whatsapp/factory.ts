// WhatsApp Provider Factory
// Returns the appropriate provider based on environment configuration

import type { WhatsAppProvider, WhatsAppProviderType } from './types'
import { WhapiProvider } from './providers/whapi'
import { MockProvider } from './providers/mock'

/**
 * Get the WhatsApp provider based on environment configuration
 * 
 * Priority:
 * 1. WHATSAPP_PROVIDER env var (whapi, waha, mock)
 * 2. Auto-detect based on available credentials
 * 3. Default to mock if no credentials found
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  const providerType = (process.env.WHATSAPP_PROVIDER || 'auto') as WhatsAppProviderType | 'auto'

  // Explicit provider selection
  if (providerType !== 'auto') {
    return createProvider(providerType)
  }

  // Auto-detect based on available credentials
  if (process.env.WHAPI_TOKEN) {
    return createProvider('whapi')
  }

  // TODO: Add WAHA detection
  // if (process.env.WAHA_BASE_URL && process.env.WAHA_SESSION) {
  //   return createProvider('waha')
  // }

  // Default to mock in development
  console.warn('⚠️  No WhatsApp provider configured. Using mock provider.')
  return createProvider('mock')
}

function createProvider(type: WhatsAppProviderType): WhatsAppProvider {
  switch (type) {
    case 'whapi':
      return new WhapiProvider()
    case 'mock':
      return new MockProvider()
    // TODO: Add more providers as needed
    // case 'waha':
    //   return new WahaProvider()
    default:
      console.warn(`⚠️  Unknown provider type: ${type}. Using mock provider.`)
      return new MockProvider()
  }
}
