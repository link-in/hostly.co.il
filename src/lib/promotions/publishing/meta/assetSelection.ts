import { z } from 'zod'
import type { MetaAssets } from './assets'
import type { MetaAssetOptions } from './oauth'

export const metaAssetSelectionSchema = z.object({
  adAccountId: z.string().min(1),
  pageId: z.string().min(1),
  useInstagram: z.boolean().default(true),
  monthlyBudgetCap: z.number().positive().max(1_000_000).nullable().default(null),
})
export type MetaAssetSelection = z.infer<typeof metaAssetSelectionSchema>

export type SelectionResult = { ok: true; assets: MetaAssets } | { ok: false; error: string }

/** The host may only pick assets their token actually has access to. */
export function resolveAssetSelection(selection: MetaAssetSelection, options: MetaAssetOptions): SelectionResult {
  const account = options.adAccounts.find((candidate) => candidate.id === selection.adAccountId)
  if (!account) return { ok: false, error: 'חשבון המודעות לא נמצא בחשבון ה-Meta שחובר' }
  if (!account.active) return { ok: false, error: 'חשבון המודעות אינו פעיל ב-Meta' }

  const page = options.pages.find((candidate) => candidate.id === selection.pageId)
  if (!page) return { ok: false, error: 'העמוד לא נמצא בחשבון ה-Meta שחובר' }

  const instagram = selection.useInstagram ? page.instagram : null
  return {
    ok: true,
    assets: {
      adAccountId: account.id,
      ...(account.currency ? { adAccountCurrency: account.currency } : {}),
      pageId: page.id,
      pageName: page.name,
      ...(instagram
        ? { instagramUserId: instagram.id, ...(instagram.username ? { instagramUsername: instagram.username } : {}) }
        : {}),
    },
  }
}
