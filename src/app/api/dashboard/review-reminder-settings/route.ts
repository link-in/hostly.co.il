import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { getUserById, updateUser } from '@/lib/auth/getUsersDb'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getUserById(session.user.id)
  return NextResponse.json({
    userId: session.user.id,
    googleReviewUrl: user?.googleReviewUrl ?? session.user.googleReviewUrl ?? null,
    reviewMessageText: user?.reviewMessageText ?? session.user.reviewMessageText ?? null,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  if (session.user.isDemo) {
    return NextResponse.json({
      success: true,
      demo: true,
      settings: {
        googleReviewUrl: typeof b?.googleReviewUrl === 'string' ? b.googleReviewUrl : null,
        reviewMessageText: typeof b?.reviewMessageText === 'string' ? b.reviewMessageText : null,
      },
    })
  }

  const updates: Record<string, any> = {}

  if (b.googleReviewUrl !== undefined) {
    const trimmedUrl = typeof b.googleReviewUrl === 'string' ? b.googleReviewUrl.trim() : ''
    if (trimmedUrl && !trimmedUrl.match(/^https?:\/\/.+/)) {
      return NextResponse.json(
        { error: 'קישור לביקורת בגוגל חייב להיות כתובת URL תקינה (מתחילה ב-http:// או https://)' },
        { status: 400 },
      )
    }
    updates.googleReviewUrl = trimmedUrl
  }

  if (b.reviewMessageText !== undefined) {
    const trimmedText = typeof b.reviewMessageText === 'string' ? b.reviewMessageText.trim() : ''
    updates.reviewMessageText = trimmedText
  }

  const updatedUser = await updateUser(session.user.id, updates)
  if (!updatedUser) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    settings: {
      googleReviewUrl: updatedUser.googleReviewUrl ?? null,
      reviewMessageText: updatedUser.reviewMessageText ?? null,
    },
  })
}
