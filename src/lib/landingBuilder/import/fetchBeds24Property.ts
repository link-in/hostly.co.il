import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import type { Beds24UserTokens } from '@/lib/beds24/userTokens'
import { PROPERTY_CONTENT_QUERY, beds24PropertiesResponseSchema, type Beds24Property } from './beds24Property'
import { PropertyImportError } from './errors'

const getBaseUrl = () => process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

export function buildPropertyContentUrl(propertyId: string, baseUrl = getBaseUrl()): string {
  const url = new URL(`${baseUrl}/properties`)
  url.searchParams.set('id', propertyId)
  for (const [key, value] of Object.entries(PROPERTY_CONTENT_QUERY)) url.searchParams.set(key, value)
  return url.toString()
}

export async function fetchBeds24Property(
  propertyId: string,
  userId: string,
  sessionTokens: Beds24UserTokens | undefined,
): Promise<Beds24Property | null> {
  const response = await fetchWithTokenRefresh(buildPropertyContentUrl(propertyId), {}, sessionTokens, userId)
  if (!response.ok) throw new PropertyImportError('beds24_unavailable', `Beds24 responded ${response.status}`)

  const parsed = beds24PropertiesResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new PropertyImportError('beds24_unavailable', parsed.error.message)

  return parsed.data.data.find((property) => property.id === propertyId) ?? null
}
