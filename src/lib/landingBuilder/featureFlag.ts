export interface SiteBuilderFlagEnv {
  flag: string | undefined
}

/**
 * The site builder wizard is on everywhere (POC users test it in production);
 * `NEXT_PUBLIC_SITE_BUILDER_ENABLED=false` is the kill switch. Read as a direct
 * `process.env.X` member so Next.js inlines it into client bundles (the sidebar
 * evaluates this in the browser) — changing it needs a redeploy.
 */
export function isSiteBuilderEnabled(
  env: SiteBuilderFlagEnv = { flag: process.env.NEXT_PUBLIC_SITE_BUILDER_ENABLED },
): boolean {
  return env.flag?.trim().toLowerCase() !== 'false'
}
