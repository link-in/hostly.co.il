import { after } from 'next/server'
import { getAvailability, refreshRoomCache } from '@/lib/availability/cache'
import { fetchLiveAvailability } from '@/lib/availability/direct'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { NightlyRate } from './nightlyRates'
import { loadSiteAvailability, type SiteAvailabilityDeps, type SiteRoom } from './siteAvailability'

interface OwnerBeds24Access {
  propertyId: string
  accessToken: string
  refreshToken: string
}

/** The owner's own tokens, falling back to the global env tokens like the other Beds24 callers. */
async function loadOwnerBeds24Access(userId: string): Promise<OwnerBeds24Access | null> {
  const { data } = await createServiceRoleClient()
    .from('users')
    .select('beds24_token, beds24_refresh_token, property_id')
    .eq('id', userId)
    .maybeSingle()
  const accessToken = (data?.beds24_token as string | null) || process.env.BEDS24_TOKEN || ''
  const refreshToken = (data?.beds24_refresh_token as string | null) || process.env.BEDS24_REFRESH_TOKEN || ''
  const propertyId = (data?.property_id as string | null) ?? ''
  return accessToken && refreshToken ? { propertyId, accessToken, refreshToken } : null
}

export async function refreshSiteRoomCache(room: SiteRoom): Promise<{ upserted: number; error?: string }> {
  const access = await loadOwnerBeds24Access(room.userId)
  if (!access) return { upserted: 0, error: 'beds24_not_configured' }
  return refreshRoomCache(room.userId, access.propertyId, room.roomId, access.accessToken, access.refreshToken)
}

function buildDeps(access: OwnerBeds24Access | null): SiteAvailabilityDeps {
  return {
    readCache: (room, window) => getAvailability(room.userId, room.roomId, window.from, window.to),
    fetchLive: async (room, window) =>
      access ? fetchLiveAvailability({ userId: room.userId, roomId: room.roomId, ...access, ...window }) : null,
    refreshInBackground: (room) =>
      after(() =>
        refreshSiteRoomCache(room).catch((error) => console.error('[site-availability] Cache refresh failed:', error)),
      ),
  }
}

/** Server entry point for both the public site endpoint and the wizard preview. */
export async function getRoomAvailability(room: SiteRoom): Promise<NightlyRate[] | null> {
  try {
    return await loadSiteAvailability(room, buildDeps(await loadOwnerBeds24Access(room.userId)))
  } catch (error) {
    console.error('[site-availability] Loading availability failed:', error)
    return null
  }
}
