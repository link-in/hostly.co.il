import { beds24V1ContentResponseSchema, extractV1Pictures } from './beds24V1Pictures'
import { PropertyImportError } from './errors'
import type { PropertyImage } from './mapBeds24Property'

const V1_CONTENT_URL = 'https://api.beds24.com/json/getPropertyContent'
const V1_TIMEOUT_MS = 10_000

export interface V1PicturesRequest {
  propertyId: string
  roomId: string | null
  alt: string
  apiKey: string
  propKey: string
}

/** API V2 returns no pictures, so they are read from the V1 JSON API (needs the property's propKey). */
export async function fetchBeds24V1Pictures(request: V1PicturesRequest): Promise<PropertyImage[]> {
  const response = await fetch(V1_CONTENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authentication: { apiKey: request.apiKey, propKey: request.propKey }, images: true }),
    cache: 'no-store',
    signal: AbortSignal.timeout(V1_TIMEOUT_MS),
  })
  if (!response.ok) throw new PropertyImportError('beds24_unavailable', `Beds24 V1 responded ${response.status}`)

  const parsed = beds24V1ContentResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new PropertyImportError('beds24_unavailable', 'Unexpected V1 getPropertyContent response')

  const content = parsed.data.getPropertyContent.find((entry) => entry.propId === request.propertyId)
  if (!content) throw new PropertyImportError('not_found', `propKey does not belong to property ${request.propertyId}`)

  return extractV1Pictures(content, request.roomId, request.alt)
}
