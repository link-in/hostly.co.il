/**
 * Read Supabase public (anon) env vars.
 *
 * Must not run at module load — `next build` imports API routes while
 * collecting page data, and Vercel can evaluate that graph before secrets
 * are injected. Call this only when creating a client.
 */
export function getSupabaseAnonEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.',
    )
  }

  return { url, anonKey }
}
