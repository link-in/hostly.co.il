import type { ChannelId, IsoDate } from './types'

const UTM_SOURCE: Record<ChannelId, string> = {
  meta_ads: 'facebook',
}

export const PROMOTION_UTM_CAMPAIGN = 'hostly_promo'

export interface LandingUrlInput {
  siteUrl: string
  channel: ChannelId
  roomId: string
  checkIn: IsoDate
  checkOut: IsoDate
}

/** Direct-booking link with the dates pre-filled and UTM tags for attribution. */
export function buildLandingUrl(input: LandingUrlInput): string {
  const url = new URL(input.siteUrl)
  url.searchParams.set('checkin', input.checkIn)
  url.searchParams.set('checkout', input.checkOut)
  url.searchParams.set('utm_source', UTM_SOURCE[input.channel])
  url.searchParams.set('utm_medium', 'paid_social')
  url.searchParams.set('utm_campaign', PROMOTION_UTM_CAMPAIGN)
  url.searchParams.set('utm_content', `${input.roomId}_${input.checkIn}`)
  return url.toString()
}
