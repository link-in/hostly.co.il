import type { CampaignContent, IsoDate, TriggerId } from '../domain/types'

/** Everything a generator may know about the offer. Built from the opportunity, never from channel data. */
export interface ContentInput {
  siteTitle: string
  roomName: string | null
  city: string | null
  trigger: TriggerId
  checkIn: IsoDate
  checkOut: IsoDate
  nights: number
  /** Lowest nightly price in the window, before discount. */
  nightlyPrice: number | null
  discountPct: number | null
  currency: string
}

/** Produces ad copy. Implementations: AI providers, fixed templates, future per-channel variants. */
export interface ContentGenerator {
  id: string
  generate(input: ContentInput): Promise<CampaignContent>
}
