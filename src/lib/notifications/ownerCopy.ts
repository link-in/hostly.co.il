/**
 * העתק זהה של הודעת האורח לבעל הנכס (הזמנה ידנית מהדשבורד).
 * נותן לבעלים ביטחון שההזמנה נקלטה ושהאורח אכן קיבל הודעה.
 */
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { sendWhatsAppToAll, type WhatsAppSendResult } from '@/lib/notifications/ownerPhones'

/** מסיר מהרשימה את טלפון האורח (למשל כשהבעלים בודק עם המספר שלו) כדי לא לשלוח אותה הודעה פעמיים. */
export function excludeGuestPhone(ownerPhones: string[], guestPhone: string): string[] {
  const guest = guestPhone ? normalizePhoneNumber(guestPhone) : ''
  return ownerPhones.filter((phone) => normalizePhoneNumber(phone) !== guest)
}

export interface OwnerCopyInput {
  ownerPhones: string[]
  guestPhone: string
  /** הטקסט המדויק שנשלח לאורח. */
  message: string
  userId?: string | null
  bookingId?: string | number | null
  guestName?: string | null
}

export async function sendOwnerCopyOfGuestMessage(input: OwnerCopyInput): Promise<WhatsAppSendResult[]> {
  const recipients = excludeGuestPhone(input.ownerPhones, input.guestPhone)
  if (recipients.length === 0) return []

  return sendWhatsAppToAll(recipients, input.message, {
    userId: input.userId,
    bookingId: input.bookingId,
    messageType: 'manual_booking_owner_copy',
    recipientRole: 'owner',
    recipientName: input.guestName,
  })
}
