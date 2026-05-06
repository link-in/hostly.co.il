import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

/**
 * POST /api/admin/beds24/create-subaccount
 * Creates a new Beds24 sub-account under the master account.
 * Requires: accounts scope on the master token.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { username, password, email } = body

  if (!username || !password || !email) {
    return NextResponse.json(
      { error: 'Missing required fields: username, password, email' },
      { status: 400 }
    )
  }

  try {
    let response: Response
    try {
      response = await fetchWithTokenRefresh(`${BASE_URL}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ username, password, email }]),
      })
    } catch (fetchErr) {
      console.error('[Beds24] fetchWithTokenRefresh threw:', fetchErr)
      return NextResponse.json(
        { error: 'שגיאת רשת בחיבור ל-Beds24', details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr) },
        { status: 500 }
      )
    }

    // Try to parse response body regardless of status
    let data: unknown
    const rawText = await response.text()
    try {
      data = JSON.parse(rawText)
    } catch {
      data = rawText
    }

    console.log(`[Beds24] POST /accounts → ${response.status}:`, JSON.stringify(data).slice(0, 500))

    if (!response.ok) {
      const isAlphaDisabled = response.status === 500 && (!rawText || rawText === '""' || rawText === '')
      if (isAlphaDisabled) {
        console.warn('[Beds24] POST /accounts returned 500 — Alpha API likely not enabled for this account')
        return NextResponse.json(
          {
            error: 'alpha_not_enabled',
            message: 'Beds24 לא הפעילה עבורך את תכונת ה-Alpha. צור את החשבון ידנית ב-Beds24 והמשך עם Invite Code.',
          },
          { status: 422 }
        )
      }
      return NextResponse.json(
        { error: 'Beds24 דחתה את הבקשה', details: data, status: response.status },
        { status: 502 }
      )
    }

    // Extract created account info from response
    const arr = Array.isArray(data) ? data : (data as { accounts?: unknown[] })?.accounts
    const created = Array.isArray(arr) ? arr[0] : null

    console.log('[Beds24] Sub-account created:', created)

    return NextResponse.json({
      success: true,
      beds24AccountId: (created as { id?: string })?.id ?? null,
      username,
      email,
      message: 'Sub-account created. Now log into Beds24 as this user and generate an Invite Code.',
    })
  } catch (error) {
    console.error('[Beds24] create-subaccount error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
