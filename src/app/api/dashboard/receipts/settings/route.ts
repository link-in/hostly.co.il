/**
 * GET  /api/dashboard/receipts/settings — public (masked) settings for current user
 * PUT  /api/dashboard/receipts/settings — upsert provider + token; optional connection test
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { getReceiptProvider } from '@/lib/receipts/factory'
import { ReceiptSettingsPutSchema } from '@/lib/receipts/schemas'
import {
  loadUserReceiptSettings,
  maskTokenPreview,
  toProviderConfig,
  upsertUserReceiptSettings,
} from '@/lib/receipts/settingsStore'

export const dynamic = 'force-dynamic'

function publicSettingsPayload(row: Awaited<ReturnType<typeof loadUserReceiptSettings>>) {
  if (!row) {
    return {
      configured: false,
      provider: 'icount' as const,
      hasApiToken: false,
      apiTokenPreview: null as string | null,
      defaultVatId: null as string | null,
      isActive: false,
    }
  }

  const token = String(row.credentials.apiToken ?? row.credentials.api_token ?? '')
  return {
    configured: Boolean(token) || row.provider === 'mock',
    provider: row.provider,
    hasApiToken: Boolean(token),
    apiTokenPreview: maskTokenPreview(token || undefined),
    defaultVatId: row.default_vat_id,
    isActive: row.is_active,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const row = await loadUserReceiptSettings(session.user.id)
    return NextResponse.json(publicSettingsPayload(row))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ReceiptSettingsPutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { provider, apiToken, keepExistingToken, defaultVatId, isActive, test } =
    parsed.data

  try {
    const existing = await loadUserReceiptSettings(session.user.id)
    const existingToken = String(
      existing?.credentials?.apiToken ?? existing?.credentials?.api_token ?? ''
    )

    let nextToken = (apiToken || '').trim()
    if (!nextToken && keepExistingToken) {
      nextToken = existingToken
    }

    if (provider === 'icount' && !nextToken) {
      return NextResponse.json(
        { error: 'נדרש API Token של iCount' },
        { status: 422 }
      )
    }

    const credentials: Record<string, unknown> = {
      ...(existing?.credentials || {}),
      apiToken: nextToken,
    }

    const saved = await upsertUserReceiptSettings(session.user.id, {
      provider,
      credentials,
      defaultVatId: defaultVatId ?? null,
      isActive,
    })

    let testResult: { ok: boolean; error?: string } | undefined
    if (test) {
      const providerInstance = getReceiptProvider(toProviderConfig(saved))
      testResult = providerInstance.testConnection
        ? await providerInstance.testConnection()
        : { ok: providerInstance.validateConfig() }
    }

    return NextResponse.json({
      ...publicSettingsPayload(saved),
      testResult,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
