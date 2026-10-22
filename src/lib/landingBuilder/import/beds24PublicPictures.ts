import type { PropertyImage } from './mapBeds24Property'

/**
 * Pictures uploaded in Beds24 (BOOKING ENGINE > PICTURES) are served publicly as
 * `https://media.xmlcal.com/pic/p{id[0..4]}/{id[4..8]}/{NN}.png`, with the property id
 * zero-padded to 8 digits. The pattern is undocumented, so it is only a fallback
 * until pictures are read through the official API.
 */
const MEDIA_BASE_URL = 'https://media.xmlcal.com/pic'
const PROPERTY_ID_PATTERN = /^\d{1,8}$/
const PROBE_TIMEOUT_MS = 5000

export const MAX_PUBLIC_PICTURES = 24

export type PictureExists = (url: string) => Promise<boolean>

export function buildPublicPictureUrl(propertyId: string, position: number): string | null {
  if (!PROPERTY_ID_PATTERN.test(propertyId) || !Number.isInteger(position) || position < 1 || position > 99) {
    return null
  }
  const padded = propertyId.padStart(8, '0')
  const file = String(position).padStart(2, '0')
  return `${MEDIA_BASE_URL}/p${padded.slice(0, 4)}/${padded.slice(4)}/${file}.png`
}

export async function headImageExists(url: string): Promise<boolean> {
  const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
  return response.ok && (response.headers.get('content-type') ?? '').startsWith('image/')
}

/** Probes every slot in parallel, so deleted pictures (gaps in the numbering) don't hide later ones. */
export async function findPublicPictures(
  propertyId: string,
  alt: string,
  exists: PictureExists = headImageExists,
  maxPictures: number = MAX_PUBLIC_PICTURES,
): Promise<PropertyImage[]> {
  const urls = Array.from({ length: maxPictures }, (_, index) => buildPublicPictureUrl(propertyId, index + 1)).filter(
    (url): url is string => url !== null,
  )
  const found = await Promise.all(urls.map((url) => exists(url).catch(() => false)))
  return urls.filter((_, index) => found[index]).map((url) => ({ url, alt }))
}
