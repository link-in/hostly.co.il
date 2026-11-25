import type { ChannelId } from '../domain/types'
import { createMetaAdsPublisher } from './meta/adsPublisher'
import type { ChannelPublisher } from './types'

/** Add a new channel: implement `ChannelPublisher`, add its id to `CHANNEL_IDS`, register it here. */
function createPublishers(): Record<ChannelId, ChannelPublisher> {
  return {
    meta_ads: createMetaAdsPublisher({ version: process.env.META_GRAPH_VERSION || undefined }),
  }
}

let publishers: Record<ChannelId, ChannelPublisher> | null = null

export function getPublisher(channel: ChannelId): ChannelPublisher {
  publishers ??= createPublishers()
  return publishers[channel]
}
