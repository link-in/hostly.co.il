import { loadExistingSite } from '@/lib/landingBuilder/persistence/siteAddressRepository'
import { buildOwnerPhoneList } from '@/lib/notifications/ownerPhones'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { parseRoomEntries, toHostSite, type HostProfile } from './hostProfile'

export async function loadHostProfile(userId: string): Promise<HostProfile | null> {
  const { data, error } = await createServiceRoleClient()
    .from('users')
    .select('id, display_name, room_id, phone_number, secondary_phone_number')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(`Loading host failed: ${error.message}`)
  if (!data) return null

  const displayName = (data.display_name as string | null) ?? null
  const site = await loadExistingSite(userId)
  return {
    userId,
    displayName,
    phones: buildOwnerPhoneList(data.phone_number as string | null, data.secondary_phone_number as string | null),
    rooms: parseRoomEntries(data.room_id as string | null),
    site: toHostSite(site, displayName),
  }
}
