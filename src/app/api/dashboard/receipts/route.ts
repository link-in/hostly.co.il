/**
 * GET  /api/dashboard/receipts
 *   ?bookingId=…     — list for one booking
 *   ?status=issued   — filter by status (optional)
 *   ?limit=200       — default 200, max 500
 *   (no bookingId)   — list all receipts for the current user
 *
 * POST /api/dashboard/receipts — issue a fiscal document via the configured provider
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { getReceiptProvider } from '@/lib/receipts/factory'
import { IssueReceiptBodySchema } from '@/lib/receipts/schemas'
import {
  loadUserReceiptSettings,
  toProviderConfig,
} from '@/lib/receipts/settingsStore'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function mapReceiptRow(row: Record<string, any>) {
  return {
    id: row.id,
    bookingId: row.beds24_booking_id,
    documentType: row.document_type,
    paymentMethod: row.payment_method,
    amount: Number(row.amount),
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    description: row.description,
    provider: row.provider,
    externalDocId: row.external_doc_id,
    externalDocNumber: row.external_doc_number,
    pdfUrl: row.pdf_url,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bookingId = request.nextUrl.searchParams.get('bookingId')?.trim() || null
  const status = request.nextUrl.searchParams.get('status')?.trim() || null
  const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 200)
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 200, 1), 500)

  const supabase = createServiceRoleClient()
  let query = supabase
    .from('issued_receipts')
    .select(
      'id, beds24_booking_id, document_type, payment_method, amount, customer_name, customer_email, customer_phone, description, provider, external_doc_id, external_doc_number, pdf_url, status, error, created_at'
    )
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (bookingId) {
    query = query.eq('beds24_booking_id', bookingId)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const receipts = (data ?? []).map(mapReceiptRow)
  const issuedBookingIds = [
    ...new Set(
      receipts
        .filter((r) => r.status === 'issued')
        .map((r) => r.bookingId)
        .filter(Boolean)
    ),
  ]

  return NextResponse.json({ receipts, issuedBookingIds })
}

export async function POST(request: NextRequest) {
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

  const parsed = IssueReceiptBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const payload = parsed.data
  const userId = session.user.id
  const supabase = createServiceRoleClient()

  // Prevent duplicate issued docs for the same booking
  const { data: existing } = await supabase
    .from('issued_receipts')
    .select('id, external_doc_number')
    .eq('user_id', userId)
    .eq('beds24_booking_id', payload.bookingId)
    .eq('status', 'issued')
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: existing.external_doc_number
          ? `כבר הופקה קבלה להזמנה זו (#${existing.external_doc_number})`
          : 'כבר הופקה קבלה להזמנה זו',
        receiptId: existing.id,
      },
      { status: 409 }
    )
  }

  let settings
  try {
    settings = await loadUserReceiptSettings(userId)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }

  if (!settings || !settings.is_active) {
    return NextResponse.json(
      {
        error:
          'ספק קבלות לא מוגדר או לא פעיל. הגדר iCount בפרופיל תחת «הנפקת קבלות».',
      },
      { status: 400 }
    )
  }

  const provider = getReceiptProvider(toProviderConfig(settings))
  if (!provider.validateConfig()) {
    return NextResponse.json(
      { error: 'הגדרות ספק הקבלות לא תקינות (חסר טוקן?)' },
      { status: 400 }
    )
  }

  const vatId =
    payload.customerVatId?.trim() || settings.default_vat_id || undefined

  const result = await provider.issueDocument({
    customer: {
      name: payload.customerName.trim(),
      email: payload.customerEmail?.trim() || undefined,
      phone: payload.customerPhone?.trim() || undefined,
      vatId,
    },
    amount: payload.amount,
    currency: 'ILS',
    description: payload.description.trim(),
    documentType: payload.documentType,
    paymentMethod: payload.paymentMethod,
    bookingId: payload.bookingId,
    userId,
    docDate: payload.docDate,
  })

  const { data: inserted, error: insertError } = await supabase
    .from('issued_receipts')
    .insert({
      user_id: userId,
      beds24_booking_id: payload.bookingId,
      document_type: payload.documentType,
      payment_method: payload.paymentMethod,
      amount: payload.amount,
      customer_name: payload.customerName.trim(),
      customer_email: payload.customerEmail?.trim() || null,
      customer_phone: payload.customerPhone?.trim() || null,
      customer_vat_id: vatId || null,
      description: payload.description.trim(),
      provider: result.provider,
      external_doc_id: result.externalDocId || null,
      external_doc_number: result.externalDocNumber || null,
      pdf_url: result.pdfUrl || null,
      raw_response: result.rawResponse ?? null,
      status: result.success ? 'issued' : 'failed',
      error: result.error || null,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[receipts] failed to persist issued_receipts:', insertError)
  }

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'הנפקת המסמך נכשלה',
        provider: result.provider,
        receiptId: inserted?.id,
      },
      { status: 502 }
    )
  }

  return NextResponse.json({
    success: true,
    provider: result.provider,
    receiptId: inserted?.id,
    externalDocId: result.externalDocId,
    externalDocNumber: result.externalDocNumber,
    pdfUrl: result.pdfUrl,
  })
}
