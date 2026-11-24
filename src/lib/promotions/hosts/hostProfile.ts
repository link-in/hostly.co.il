import { buildSiteHost } from '@/lib/landingBuilder/siteAddress'
import type { ExistingSite } from '@/lib/landingBuilder/persistence/siteAddressRepository'

export const MAX_AD_IMAGES = 5

export interface HostRoom {
  id: string
  name: string | null
}

export interface HostSite {
  url: string
  title: string
  city: string | null
  imageUrls: string[]
}

/** What the promotion flows need to know about a host. Built from `users` + the published site. */
export interface HostProfile {
  userId: string
  displayName: string | null
  phones: string[]
  rooms: HostRoom[]
  site: HostSite | null
}

/** `users.room_id`: "1", "1,2" or "1:Name,2:Other". */
export function parseRoomEntries(roomField: string | null | undefined): HostRoom[] {
  return (roomField ?? '')
    .split(',')
    .map((part) => {
      const [id, ...nameParts] = part.split(':')
      const name = nameParts.join(':').trim()
      return { id: id.trim(), name: name || null }
    })
    .filter((room) => room.id)
}

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/** Cover image first, then the rest; only absolute URLs an ad platform can download. */
export function pickAdImages(site: ExistingSite): string[] {
  const draft = site.publishedDraft
  if (!draft) return []
  const cover = draft.images.find((image) => image.id === draft.coverImageId)
  const ordered = cover ? [cover, ...draft.images.filter((image) => image !== cover)] : draft.images
  return ordered
    .map((image) => image.url)
    .filter(isAbsoluteHttpUrl)
    .slice(0, MAX_AD_IMAGES)
}

/** A site is promotable only once it is published. */
export function toHostSite(site: ExistingSite | null, fallbackTitle: string | null): HostSite | null {
  if (!site?.address || !site.publishedAt || !site.publishedDraft) return null
  const content = site.publishedDraft.content
  return {
    url: `https://${buildSiteHost(site.address)}`,
    title: content.siteTitle || content.heroTitle || fallbackTitle || site.address,
    city: content.city || null,
    imageUrls: pickAdImages(site),
  }
}
