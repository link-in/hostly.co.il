import { z } from 'zod'

/** What the host picked after connecting Meta. Stored in `promotion_connections.assets`. */
export const metaAssetsSchema = z.object({
  adAccountId: z.string().regex(/^act_\d+$/),
  adAccountCurrency: z.string().length(3).optional(),
  pageId: z.string().regex(/^\d+$/),
  pageName: z.string().optional(),
  instagramUserId: z.string().regex(/^\d+$/).optional(),
  instagramUsername: z.string().optional(),
})
export type MetaAssets = z.infer<typeof metaAssetsSchema>

export function parseMetaAssets(assets: Record<string, unknown>): MetaAssets | null {
  const parsed = metaAssetsSchema.safeParse(assets)
  return parsed.success ? parsed.data : null
}
