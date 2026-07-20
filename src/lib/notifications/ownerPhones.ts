/**
 * Shared helpers for sending the same owner-facing WhatsApp message to every
 * configured recipient (primary owner phone + optional secondary phone, e.g.
 * a co-host or property manager).
 */
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

/** Builds a deduplicated, normalized list of phone numbers from any number of optional inputs. */
export function buildOwnerPhoneList(...phones: Array<string | null | undefined>): string[] {
  const normalized = phones
    .map((phone) => phone?.trim())
    .filter((phone): phone is string => !!phone)
    .map((phone) => normalizePhoneNumber(phone))

  return Array.from(new Set(normalized))
}

export interface WhatsAppSendResult {
  to: string
  success: boolean
  provider: string
  error?: string
}

/** Sends the same WhatsApp message to every phone number in the list. */
export async function sendWhatsAppToAll(
  phones: string[],
  message: string,
): Promise<WhatsAppSendResult[]> {
  const results: WhatsAppSendResult[] = []
  for (const to of phones) {
    const result = await sendWhatsAppMessage({ to, message })
    results.push({ to, ...result })
  }
  return results
}
