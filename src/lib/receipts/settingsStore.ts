import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ReceiptProviderConfig, ReceiptProviderType } from '@/lib/receipts/types'

export interface UserReceiptSettingsRow {
  user_id: string
  provider: string
  credentials: Record<string, unknown>
  default_vat_id: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export async function loadUserReceiptSettings(
  userId: string
): Promise<UserReceiptSettingsRow | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('user_receipt_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null

  return {
    user_id: data.user_id,
    provider: data.provider,
    credentials: (data.credentials as Record<string, unknown>) || {},
    default_vat_id: data.default_vat_id ?? null,
    is_active: Boolean(data.is_active),
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export function toProviderConfig(row: UserReceiptSettingsRow): ReceiptProviderConfig {
  return {
    provider: (row.provider as ReceiptProviderType) || 'icount',
    credentials: row.credentials || {},
    defaultVatId: row.default_vat_id,
    isActive: row.is_active,
  }
}

export function maskTokenPreview(token: string | undefined): string | null {
  if (!token) return null
  if (token.length <= 8) return '••••••••'
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

export async function upsertUserReceiptSettings(
  userId: string,
  patch: {
    provider: ReceiptProviderType
    credentials: Record<string, unknown>
    defaultVatId?: string | null
    isActive: boolean
  }
): Promise<UserReceiptSettingsRow> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('user_receipt_settings')
    .upsert(
      {
        user_id: userId,
        provider: patch.provider,
        credentials: patch.credentials,
        default_vat_id: patch.defaultVatId ?? null,
        is_active: patch.isActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save receipt settings')
  }

  return {
    user_id: data.user_id,
    provider: data.provider,
    credentials: (data.credentials as Record<string, unknown>) || {},
    default_vat_id: data.default_vat_id ?? null,
    is_active: Boolean(data.is_active),
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}
