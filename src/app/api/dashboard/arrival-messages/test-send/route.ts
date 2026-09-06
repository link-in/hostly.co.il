/**
 * Test-send — sends the arrival-day WhatsApp preview to the host's own phone.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { getArrivalMessageSettings } from '@/lib/db/arrivalMessages'
import { buildArrivalCaption, buildHouseRulesMessage } from '@/lib/arrivalMessages/message'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.isDemo) {
    return NextResponse.json({ success: true, demo: true, message: 'Demo mode — no message sent' })
  }

  const settings = await getArrivalMessageSettings(session.user.id)
  if (!settings?.photoUrl) {
    return NextResponse.json(
      { error: 'לא הועלתה תמונה — יש להעלות תמונת בית לפני השליחה' },
      { status: 400 },
    )
  }

  const ownerPhoneRaw = (session.user as any).phoneNumber ?? ''
  if (!ownerPhoneRaw) {
    return NextResponse.json(
      { error: 'לא נמצא מספר טלפון — הגדר מספר בפרופיל שלך' },
      { status: 400 },
    )
  }

  const ownerPhone = normalizePhoneNumber(ownerPhoneRaw)
  const propertyName = (session.user as any).displayName || 'הנכס שלנו'

  const messageInput = {
    guestName: 'אורח לדוגמה',
    propertyName,
    introText: settings.introText,
    wazeLink: settings.wazeLink,
    houseRules: settings.houseRules,
  }

  const caption = buildArrivalCaption(messageInput)

  const result = await sendWhatsAppMessage(
    { to: ownerPhone, message: caption, image: settings.photoUrl, caption },
    {
      userId: session.user.id,
      messageType: 'arrival_day_guest',
      recipientRole: 'owner',
      recipientName: propertyName,
    },
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'שליחה נכשלה' }, { status: 500 })
  }

  // Also send rules if present
  const rulesText = buildHouseRulesMessage(messageInput)
  if (rulesText) {
    await sendWhatsAppMessage(
      { to: ownerPhone, message: rulesText },
      { userId: session.user.id, messageType: 'arrival_day_guest', recipientRole: 'owner' },
    ).catch(() => null)
  }

  return NextResponse.json({ success: true, sentTo: ownerPhone })
}
