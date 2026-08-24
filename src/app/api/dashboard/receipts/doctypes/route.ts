/**
 * GET /api/dashboard/receipts/doctypes
 * Returns creatable document types from the user's receipt provider (iCount),
 * plus Hostly documentType options that can be mapped onto them.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { DOCTYPE_PREFERENCES } from '@/lib/receipts/icountMap'
import { getReceiptProvider } from '@/lib/receipts/factory'
import {
  loadUserReceiptSettings,
  toProviderConfig,
} from '@/lib/receipts/settingsStore'
import type { ReceiptDocumentType } from '@/lib/receipts/types'

export const dynamic = 'force-dynamic'

const HOSTLY_LABELS: Record<ReceiptDocumentType, string> = {
  receipt: 'קבלה',
  tax_invoice: 'חשבונית מס',
  tax_invoice_receipt: 'חשבונית מס קבלה',
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await loadUserReceiptSettings(session.user.id)
    if (!settings || !settings.is_active) {
      return NextResponse.json({
        providerTypes: [],
        hostlyOptions: [
          { value: 'receipt', label: HOSTLY_LABELS.receipt, available: true },
        ],
      })
    }

    const provider = getReceiptProvider(toProviderConfig(settings))
    if (!provider.listDocumentTypes) {
      return NextResponse.json({
        providerTypes: [],
        hostlyOptions: (Object.keys(HOSTLY_LABELS) as ReceiptDocumentType[]).map(
          (value) => ({
            value,
            label: HOSTLY_LABELS[value],
            available: true,
          })
        ),
      })
    }

    const providerTypes = await provider.listDocumentTypes()
    const availableCodes = new Set(providerTypes.map((t) => t.doctype))

    const hostlyOptions = (Object.keys(HOSTLY_LABELS) as ReceiptDocumentType[]).map(
      (value) => {
        const preferred = DOCTYPE_PREFERENCES[value]
        const matched = preferred.find((code) => availableCodes.has(code))
        return {
          value,
          label: HOSTLY_LABELS[value],
          available: Boolean(matched),
          mapsTo: matched || null,
        }
      }
    )

    return NextResponse.json({ providerTypes, hostlyOptions })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    )
  }
}
