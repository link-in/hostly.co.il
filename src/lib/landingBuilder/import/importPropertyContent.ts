import { parseRoomIds } from '@/lib/rooms/roomIds'
import { DEMO_PROPERTY } from '../demoProperty'
import { propertyContentSchema, type PropertyContent } from '../types'
import type { Beds24Property } from './beds24Property'
import { PropertyImportError } from './errors'
import { mapBeds24Property, selectRoom, type PropertyImage } from './mapBeds24Property'

export interface ImportRequest {
  userId: string
  /** Demo users get the demo property, like the rest of the dashboard's mock provider. */
  isDemo?: boolean
  /** `users.property_id` from the session — never taken from the client. */
  propertyId: string | null | undefined
  /** `users.room_id` from the session (any of the formats `parseRoomIds` accepts). */
  roomField: string | null | undefined
  /** Room selected in the dashboard; honored only if it belongs to the user. */
  requestedRoomId?: string
}

export interface ImportDeps {
  fetchProperty: (propertyId: string) => Promise<Beds24Property | null>
  loadImages: (userId: string, alt: string) => Promise<PropertyImage[]>
  findBeds24Pictures: (propertyId: string, roomId: string | null, alt: string) => Promise<PropertyImage[]>
}

const BEDS24_ID_PATTERN = /^\d+$/

export function resolveRoomId(roomField: string | null | undefined, requestedRoomId?: string): string | null {
  const roomIds = parseRoomIds(roomField)
  if (requestedRoomId && roomIds.includes(requestedRoomId)) return requestedRoomId
  return roomIds[0] ?? null
}

async function loadSafely(source: string, load: () => Promise<PropertyImage[]>): Promise<PropertyImage[]> {
  try {
    return await load()
  } catch (error) {
    console.warn(`[landing-builder] Failed to load ${source}, importing without them:`, error)
    return []
  }
}

/** Images the user curated in the landing editor come first, then the Beds24 pictures. */
export function mergeImages(...sources: PropertyImage[][]): PropertyImage[] {
  const seen = new Set<string>()
  return sources.flat().filter((image) => !seen.has(image.url) && seen.add(image.url))
}

interface ImageLookup {
  userId: string
  propertyId: string
  roomId: string | null
  alt: string
}

async function loadAllImages(deps: ImportDeps, { userId, propertyId, roomId, alt }: ImageLookup) {
  const [landingImages, beds24Pictures] = await Promise.all([
    loadSafely('landing images', () => deps.loadImages(userId, alt)),
    loadSafely('Beds24 pictures', () => deps.findBeds24Pictures(propertyId, roomId, alt)),
  ])
  return mergeImages(landingImages, beds24Pictures)
}

export async function importPropertyContent(request: ImportRequest, deps: ImportDeps): Promise<PropertyContent> {
  if (request.isDemo) return DEMO_PROPERTY

  const propertyId = request.propertyId?.trim()
  if (!propertyId || !BEDS24_ID_PATTERN.test(propertyId)) throw new PropertyImportError('no_property', propertyId)

  const property = await deps.fetchProperty(propertyId)
  if (!property) throw new PropertyImportError('not_found', `property ${propertyId}`)

  const roomId = resolveRoomId(request.roomField, request.requestedRoomId)
  const alt = selectRoom(property, roomId)?.name ?? property.name ?? ''
  const images = await loadAllImages(deps, { userId: request.userId, propertyId, roomId, alt })

  const parsed = propertyContentSchema.safeParse(mapBeds24Property({ property, roomId, images }))
  if (!parsed.success) throw new PropertyImportError('invalid_content', parsed.error.message)
  return parsed.data
}
