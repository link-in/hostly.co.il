import { z } from 'zod'
import type { PropertyImage } from './mapBeds24Property'

/** Shape of `images` in the V1 JSON `getPropertyContent` response (hosted 1..N, external 1..100). */
const pictureMapEntrySchema = z.looseObject({
  propId: z.coerce.string(),
  roomId: z.coerce.string().optional(),
  position: z.coerce.number(),
})

const pictureSchema = z.looseObject({
  url: z.string(),
  map: z.array(pictureMapEntrySchema).catch([]),
})

const pictureSlotsSchema = z.record(z.string(), pictureSchema).catch({})

const imagesSchema = z
  .looseObject({ hosted: pictureSlotsSchema.optional(), external: pictureSlotsSchema.optional() })
  .catch({})

export const beds24V1PropertyContentSchema = z.looseObject({
  propId: z.coerce.string(),
  images: imagesSchema.optional(),
})

export const beds24V1ContentResponseSchema = z.looseObject({
  getPropertyContent: z.array(beds24V1PropertyContentSchema),
})

export type Beds24V1PropertyContent = z.infer<typeof beds24V1PropertyContentSchema>
type Beds24V1Picture = z.infer<typeof pictureSchema>

interface PlacedPicture {
  url: string
  position: number
}

const isHttpsUrl = (url: string) => z.url({ protocol: /^https$/ }).safeParse(url).success

function allPictures(content: Beds24V1PropertyContent): Beds24V1Picture[] {
  const { hosted = {}, external = {} } = content.images ?? {}
  return [...Object.values(hosted), ...Object.values(external)].filter((picture) => isHttpsUrl(picture.url))
}

function placePictures(
  pictures: Beds24V1Picture[],
  matches: (entry: z.infer<typeof pictureMapEntrySchema>) => boolean,
): PlacedPicture[] {
  return pictures.flatMap((picture) => {
    const entry = picture.map.find(matches)
    return entry ? [{ url: picture.url, position: entry.position }] : []
  })
}

/**
 * Room pictures win (in the room's order), then property pictures. Unassigned
 * pictures are used only when nothing is assigned, so a fresh Airbnb import
 * still yields images.
 */
export function extractV1Pictures(
  content: Beds24V1PropertyContent,
  roomId: string | null,
  alt: string,
): PropertyImage[] {
  const pictures = allPictures(content)
  const propId = content.propId
  const room = roomId ? placePictures(pictures, (entry) => entry.propId === propId && entry.roomId === roomId) : []
  const property = placePictures(pictures, (entry) => entry.propId === propId && !entry.roomId)
  const chosen = room.length ? room : property

  const urls = chosen.length
    ? [...chosen].sort((a, b) => a.position - b.position).map((picture) => picture.url)
    : pictures.filter((picture) => picture.map.length === 0).map((picture) => picture.url)

  return [...new Set(urls)].map((url) => ({ url, alt }))
}
