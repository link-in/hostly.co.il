/**
 * Shared helpers for sending the same owner-facing WhatsApp message to every
 * configured recipient (primary owner phone + optional secondary phone, e.g.
 * a co-host or property manager). Used for new bookings, cancellations, and
 * check-in completion alerts.
 */
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { WhatsAppSendMeta } from '@/lib/whatsapp'

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
  meta?: WhatsAppSendMeta,
): Promise<WhatsAppSendResult[]> {
  const results: WhatsAppSendResult[] = []
  for (const to of phones) {
    const result = await sendWhatsAppMessage(
      { to, message },
      meta
        ? {
            ...meta,
            recipientRole: meta.recipientRole ?? 'owner',
          }
        : undefined,
    )
    results.push({ to, ...result })
  }
  return results
}
