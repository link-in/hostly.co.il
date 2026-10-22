import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { PropertyImage } from './mapBeds24Property'

const landingImageRowSchema = z.object({
  public_url: z.url(),
  section_type: z.string(),
  order_index: z.number().nullable(),
})
type LandingImageRow = z.infer<typeof landingImageRowSchema>

const SECTION_ORDER = ['hero', 'portfolio']

/** Hero images first (best cover candidates), then the gallery, each in saved order. */
export function toPropertyImages(rows: unknown[], alt: string): PropertyImage[] {
  const sectionRank = (row: LandingImageRow) => {
    const index = SECTION_ORDER.indexOf(row.section_type)
    return index === -1 ? SECTION_ORDER.length : index
  }
  const valid = rows.flatMap((row) => {
    const parsed = landingImageRowSchema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })

  const sorted = [...valid].sort(
    (a, b) => sectionRank(a) - sectionRank(b) || (a.order_index ?? 0) - (b.order_index ?? 0),
  )
  return [...new Set(sorted.map((row) => row.public_url))].map((url) => ({ url, alt }))
}

/** Images uploaded through the landing editor (`landing_images`). */
export async function loadLandingImages(userId: string, alt: string): Promise<PropertyImage[]> {
  const supabase = createServerClient()
  const { data: page } = await supabase.from('landing_pages').select('id').eq('user_id', userId).maybeSingle()
  if (!page) return []

  const { data: rows } = await supabase
    .from('landing_images')
    .select('public_url, section_type, order_index')
    .eq('landing_page_id', page.id)
  return toPropertyImages(rows ?? [], alt)
}
