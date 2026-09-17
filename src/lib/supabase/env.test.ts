import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('getSupabaseAnonEnv', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when URL or anon key is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    const { getSupabaseAnonEnv } = await import('./env')
    expect(() => getSupabaseAnonEnv()).toThrow(/Missing Supabase environment variables/)
  })

  it('throws when only the URL is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    const { getSupabaseAnonEnv } = await import('./env')
    expect(() => getSupabaseAnonEnv()).toThrow(/Missing Supabase environment variables/)
  })

  it('returns url and anon key when both are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    const { getSupabaseAnonEnv } = await import('./env')
    expect(getSupabaseAnonEnv()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    })
  })
})

describe('supabase server module load (Vercel collect page data)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('imports without throwing when Supabase env vars are absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

    await expect(import('./server')).resolves.toMatchObject({
      createServerClient: expect.any(Function),
      createServiceRoleClient: expect.any(Function),
    })
  })

  it('createServerClient throws only when invoked without env', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    const { createServerClient } = await import('./server')
    expect(() => createServerClient()).toThrow(/Missing Supabase environment variables/)
  })

  it('createServiceRoleClient throws without a service role key', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { createServiceRoleClient } = await import('./server')
    expect(() => createServiceRoleClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })
})
