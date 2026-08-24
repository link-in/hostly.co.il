import { parseICountCredentials, ICountProvider } from './providers/icount'
import { MockReceiptProvider } from './providers/mock'
import type { ReceiptProvider, ReceiptProviderConfig } from './types'

/**
 * Build a receipt provider from per-user settings.
 * Inactive / unknown providers fall back to mock only when explicitly `mock`.
 */
export function getReceiptProvider(settings: ReceiptProviderConfig): ReceiptProvider {
  switch (settings.provider) {
    case 'icount':
      return new ICountProvider(parseICountCredentials(settings.credentials))
    case 'mock':
      return new MockReceiptProvider()
    default: {
      console.warn(
        `⚠️ Unknown receipt provider "${String((settings as ReceiptProviderConfig).provider)}". Using mock.`
      )
      return new MockReceiptProvider()
    }
  }
}
