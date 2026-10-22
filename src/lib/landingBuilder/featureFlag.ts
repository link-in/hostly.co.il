export interface SiteBuilderFlagEnv {
  nodeEnv: string | undefined
  flag: string | undefined
}

/**
 * The site builder wizard is under development: on in local dev, and anywhere
 * `NEXT_PUBLIC_SITE_BUILDER_ENABLED=true` is set (e.g. a Vercel preview).
 * Env vars are read as direct `process.env.X` members so Next.js inlines them
 * into client bundles (the sidebar evaluates this in the browser).
 */
export function isSiteBuilderEnabled(
  env: SiteBuilderFlagEnv = {
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.NEXT_PUBLIC_SITE_BUILDER_ENABLED,
  },
): boolean {
  return env.nodeEnv === 'development' || env.flag === 'true'
}
