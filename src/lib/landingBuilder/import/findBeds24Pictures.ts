import type { PropertyImage } from './mapBeds24Property'

export interface PictureSources {
  loadPropKey: () => Promise<string | null>
  fetchWithPropKey: (propKey: string) => Promise<PropertyImage[]>
  probePublicUrls: () => Promise<PropertyImage[]>
}

/** Official V1 API when the property has a propKey; the public URL pattern otherwise or if V1 fails. */
export async function findBeds24Pictures(sources: PictureSources): Promise<PropertyImage[]> {
  const propKey = await sources.loadPropKey().catch(() => null)
  if (propKey) {
    try {
      return await sources.fetchWithPropKey(propKey)
    } catch (error) {
      console.warn('[landing-builder] Beds24 V1 pictures failed, probing public URLs:', error)
    }
  }
  return sources.probePublicUrls()
}
