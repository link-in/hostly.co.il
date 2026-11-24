import type { CampaignContent } from '../../domain/types'

/** Ad body as published: primary text, then hashtags on their own line. Shared by the publisher and the preview. */
export function buildAdMessage(content: CampaignContent): string {
  return content.hashtags.length ? `${content.primaryText}\n\n${content.hashtags.join(' ')}` : content.primaryText
}
