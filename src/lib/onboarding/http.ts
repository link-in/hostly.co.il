import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { z } from 'zod'
import { authOptions } from '@/lib/auth/authOptions'
import { OnboardingError } from './errors'

export type RouteParams = { params: Promise<{ userId: string }> }

export async function isAdminSession(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'admin'
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: NextResponse }> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return { response: NextResponse.json({ error: parsed.error.flatten() }, { status: 422 }) }
  }
  return { data: parsed.data }
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof OnboardingError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status })
  }
  const message = err instanceof Error ? err.message : String(err)
  console.error('[Onboarding] unexpected error:', message)
  return NextResponse.json({ error: 'שגיאה פנימית', details: message }, { status: 500 })
}

/** Wraps an admin-only onboarding handler with auth and uniform error mapping. */
export function adminOnboardingHandler(
  handler: (request: Request, userId: string) => Promise<NextResponse>,
) {
  return async (request: Request, { params }: RouteParams): Promise<NextResponse> => {
    if (!(await isAdminSession())) return forbidden()
    const { userId } = await params
    try {
      return await handler(request, userId)
    } catch (err) {
      return errorResponse(err)
    }
  }
}
