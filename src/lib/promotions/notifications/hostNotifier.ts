import { sendWhatsAppToAll } from '@/lib/notifications/ownerPhones'
import { formatStayRange } from '../content/offer'
import type { PromotionCampaign } from '../domain/types'
import type { HostProfile } from '../hosts/hostProfile'

/** How hosts hear about promotions. WhatsApp today; email/push can implement the same port. */
export interface HostNotifier {
  draftsReady(host: HostProfile, campaigns: PromotionCampaign[]): Promise<void>
  launchFailed(host: HostProfile, campaign: PromotionCampaign, error: string): Promise<void>
  connectionNeedsAttention(host: HostProfile, channelLabel: string, expired: boolean): Promise<void>
}

export function promotionsDashboardUrl(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.NEXT_PUBLIC_APP_URL || 'https://app.hostly.co.il'
  return `${base.replace(/\/$/, '')}/dashboard/promotions`
}

function campaignLine(campaign: PromotionCampaign): string {
  const room = campaign.roomName ? `${campaign.roomName}: ` : ''
  return `• ${room}${formatStayRange(campaign.checkIn, campaign.checkOut)}`
}

export function draftsReadyMessage(campaigns: PromotionCampaign[], url: string): string {
  return [
    `יש ${campaigns.length === 1 ? 'תאריך פנוי' : `${campaigns.length} חלונות פנויים`} שאפשר לקדם בפייסבוק ובאינסטגרם:`,
    ...campaigns.map(campaignLine),
    '',
    'הכנו קמפיין עם טקסט ותמונה. הוא לא יעלה בלי האישור שלך.',
    `לצפייה ואישור: ${url}`,
  ].join('\n')
}

export function createWhatsAppHostNotifier(dashboardUrl = promotionsDashboardUrl()): HostNotifier {
  async function send(host: HostProfile, message: string) {
    if (host.phones.length === 0) return
    await sendWhatsAppToAll(host.phones, message, {
      userId: host.userId,
      messageType: 'promotion_owner',
      recipientRole: 'owner',
      recipientName: host.displayName,
    })
  }

  return {
    async draftsReady(host, campaigns) {
      if (campaigns.length === 0) return
      await send(host, draftsReadyMessage(campaigns, dashboardUrl))
    },

    async launchFailed(host, campaign, error) {
      await send(
        host,
        [
          `הקמפיין ל-${formatStayRange(campaign.checkIn, campaign.checkOut)} לא עלה.`,
          `סיבה: ${error}`,
          `פרטים: ${dashboardUrl}`,
        ].join('\n'),
      )
    },

    async connectionNeedsAttention(host, channelLabel, expired) {
      const status = expired ? 'החיבור פג' : 'החיבור עומד לפוג בימים הקרובים'
      await send(host, [`${status} ל-${channelLabel}.`, `כדי להמשיך לפרסם, חברו מחדש: ${dashboardUrl}`].join('\n'))
    },
  }
}
