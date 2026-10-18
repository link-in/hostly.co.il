import { beds24Request, type OnboardingCallContext } from '../beds24Client'
import { BOOKING_WEBHOOK_URL, BOOKING_WEBHOOK_VERSION } from '../constants'
import { multiplePostResponseSchema } from '../schemas'

/**
 * ה-webhook של Beds24 מוגדר לכל נכס בנפרד. בלעדיו הבעלים לא מקבל התראת WhatsApp/Push
 * על הזמנות מ-Airbnb / Booking.com / הזמנות שהוזנו ישירות ב-Beds24.
 */
export function buildBookingWebhookPayload(propertyId: string, url: string = BOOKING_WEBHOOK_URL) {
  return [{
    id: Number(propertyId),
    webhooks: {
      url,
      version: BOOKING_WEBHOOK_VERSION,
      additionalData: 'none',
      customHeader: '',
    },
  }]
}

/** Idempotent: ריצה חוזרת פשוט כותבת את אותה הגדרה. */
export async function setBookingWebhook(
  ctx: OnboardingCallContext,
  propertyId: string,
): Promise<{ url: string }> {
  await beds24Request(ctx, {
    method: 'POST',
    path: '/properties',
    body: buildBookingWebhookPayload(propertyId),
    schema: multiplePostResponseSchema,
  })
  return { url: BOOKING_WEBHOOK_URL }
}
