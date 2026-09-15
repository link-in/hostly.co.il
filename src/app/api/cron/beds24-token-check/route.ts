/**
 * GET /api/cron/beds24-token-check
 *
 * Daily cron job that checks when the global Beds24 refresh token expires
 * and sends a WhatsApp warning to the admin 7 days before it does.
 *
 * Scheduled: daily at 08:00 UTC (11:00 Israel time) — see vercel.json
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const WARN_DAYS_BEFORE = 7 // send alert this many days before expiry

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[Beds24TokenCheck] CRON_SECRET is not configured — refusing to run')
    return false
  }
  return request.headers.get('authorization') === `Bearer ${secret}`
}

/**
 * Returns the expiry timestamp (ms) of the global refresh token.
 * Checks the DB first; falls back to env var assumption (30 days from now as worst-case).
 */
async function getRefreshTokenExpiryMs(): Promise<{ expiresAt: number; source: string }> {
  try {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('beds24_global_tokens')
      .select('expires_at, updated_at')
      .eq('id', 'global')
      .single()

    if (data) {
      const row = data as { expires_at: string; updated_at: string }
      return {
        expiresAt: new Date(row.expires_at).getTime(),
        source: 'database',
      }
    }
  } catch {
    // DB not available — fall through to env-based estimate
  }

  // Fallback: if no DB record, assume 24-hour expiry from now (access token)
  // The cron will keep reminding until the DB is set up.
  return {
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    source: 'env-fallback',
  }
}

/**
 * Get the admin phone number to send the WhatsApp alert to.
 * Uses ADMIN_PHONE env var, or falls back to fetching the first admin user from DB.
 */
async function getAdminPhone(): Promise<string | null> {
  // Prefer explicit env var
  if (process.env.ADMIN_PHONE) return process.env.ADMIN_PHONE

  try {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('users')
      .select('phone_number')
      .eq('role', 'admin')
      .not('phone_number', 'is', null)
      .limit(1)
      .single()

    if (data) {
      const row = data as { phone_number: string }
      return row.phone_number
    }
  } catch {
    // ignore
  }

  return null
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { expiresAt, source } = await getRefreshTokenExpiryMs()
  const nowMs = Date.now()
  const daysUntilExpiry = Math.floor((expiresAt - nowMs) / (1000 * 60 * 60 * 24))
  const expiryDate = new Date(expiresAt).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jerusalem',
  })

  console.log(`[Beds24TokenCheck] Refresh token expires in ${daysUntilExpiry} days (${expiryDate}) — source: ${source}`)

  // Only alert within the warning window
  if (daysUntilExpiry > WARN_DAYS_BEFORE) {
    return NextResponse.json({
      ok: true,
      message: `Token expires in ${daysUntilExpiry} days — no alert needed yet`,
      expiresAt: new Date(expiresAt).toISOString(),
    })
  }

  // --- Send WhatsApp alert ---
  const adminPhone = await getAdminPhone()
  if (!adminPhone) {
    console.error('[Beds24TokenCheck] No admin phone number found — cannot send alert')
    return NextResponse.json({
      ok: false,
      error: 'No admin phone configured. Set ADMIN_PHONE env var or add phone to admin user.',
      daysUntilExpiry,
    })
  }

  const urgency = daysUntilExpiry <= 1 ? '🚨 דחוף!' : daysUntilExpiry <= 3 ? '⚠️ דחוף' : '⏰'
  const message =
    `${urgency} *טוקן Beds24 עומד לפוג!*\n\n` +
    `תאריך פקיעה: *${expiryDate}*\n` +
    `ימים שנותרו: *${daysUntilExpiry}*\n\n` +
    `*מה לעשות:*\n` +
    `1. כנס ל-Beds24 → Settings → API\n` +
    `2. לחץ "Generate Invite Code"\n` +
    `3. הכנס את הקוד בפאנל האדמין:\n` +
    `   https://app.hostly.co.il/admin\n\n` +
    `האפלקציה תמשיך לעבוד עד לתאריך הפקיעה.`

  const result = await sendWhatsAppMessage(
    { to: adminPhone, message },
    {
      messageType: 'system_alert',
      recipientRole: 'admin',
      recipientName: 'Admin',
    }
  )

  console.log(`[Beds24TokenCheck] WhatsApp alert sent to ${adminPhone}:`, result.success ? '✅' : `❌ ${result.error}`)

  return NextResponse.json({
    ok: true,
    alertSent: result.success,
    adminPhone,
    daysUntilExpiry,
    expiresAt: new Date(expiresAt).toISOString(),
    whatsappResult: result,
  })
}
