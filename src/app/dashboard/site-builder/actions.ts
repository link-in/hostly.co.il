'use server'

import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/authOptions'
import { findPublicPictures } from '@/lib/landingBuilder/import/beds24PublicPictures'
import { loadBeds24PropKey } from '@/lib/landingBuilder/import/beds24PropKey'
import { fetchBeds24V1Pictures } from '@/lib/landingBuilder/import/fetchBeds24V1Pictures'
import { findBeds24Pictures } from '@/lib/landingBuilder/import/findBeds24Pictures'
import { fetchBeds24Property } from '@/lib/landingBuilder/import/fetchBeds24Property'
import { importPropertyContent } from '@/lib/landingBuilder/import/importPropertyContent'
import { toImportErrorMessage } from '@/lib/landingBuilder/import/errors'
import { loadLandingImages } from '@/lib/landingBuilder/import/loadLandingImages'
import { isSiteBuilderEnabled } from '@/lib/landingBuilder/featureFlag'
import type { PropertyContent } from '@/lib/landingBuilder/types'

export type ImportPropertyResult = { ok: true; property: PropertyContent } | { ok: false; error: string }

const requestedRoomIdSchema = z.string().regex(/^\d+$/).optional()

function findPicturesForUser(userId: string, lookup: { propertyId: string; roomId: string | null; alt: string }) {
  const apiKey = process.env.BEDS24_API_KEY
  return findBeds24Pictures({
    loadPropKey: async () => (apiKey ? loadBeds24PropKey(userId, lookup.propertyId) : null),
    fetchWithPropKey: (propKey) => fetchBeds24V1Pictures({ ...lookup, apiKey: apiKey ?? '', propKey }),
    probePublicUrls: () => findPublicPictures(lookup.propertyId, lookup.alt),
  })
}

export async function importPropertyContentAction(requestedRoomId?: string): Promise<ImportPropertyResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isSiteBuilderEnabled()) return { ok: false, error: 'יש להתחבר מחדש למערכת.' }

  const roomInput = requestedRoomIdSchema.safeParse(requestedRoomId || undefined)
  const { user } = session
  const sessionTokens =
    user.beds24Token && user.beds24RefreshToken
      ? { accessToken: user.beds24Token, refreshToken: user.beds24RefreshToken }
      : undefined

  try {
    const property = await importPropertyContent(
      {
        userId: user.id,
        isDemo: user.isDemo,
        propertyId: user.propertyId,
        roomField: user.roomId,
        requestedRoomId: roomInput.success ? roomInput.data : undefined,
      },
      {
        fetchProperty: (propertyId) => fetchBeds24Property(propertyId, user.id, sessionTokens),
        loadImages: loadLandingImages,
        findBeds24Pictures: (propertyId, roomId, alt) => findPicturesForUser(user.id, { propertyId, roomId, alt }),
      },
    )
    return { ok: true, property }
  } catch (error) {
    console.error('[landing-builder] Property import failed:', error)
    return { ok: false, error: toImportErrorMessage(error) }
  }
}
