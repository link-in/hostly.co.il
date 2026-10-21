/**
 * The site builder wizard is under development: on in local dev, and anywhere
 * `NEXT_PUBLIC_SITE_BUILDER_ENABLED=true` is set (e.g. a Vercel preview).
 */
export function isSiteBuilderEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'development' || env.NEXT_PUBLIC_SITE_BUILDER_ENABLED === 'true'
}
