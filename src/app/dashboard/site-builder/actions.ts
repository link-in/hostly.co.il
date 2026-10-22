'use server'

import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchBeds24Property } from '@/lib/landingBuilder/import/fetchBeds24Property'
import { importPropertyContent } from '@/lib/landingBuilder/import/importPropertyContent'
import { toImportErrorMessage } from '@/lib/landingBuilder/import/errors'
import { loadLandingImages } from '@/lib/landingBuilder/import/loadLandingImages'
import { isSiteBuilderEnabled } from '@/lib/landingBuilder/featureFlag'
import type { PropertyContent } from '@/lib/landingBuilder/types'

export type ImportPropertyResult = { ok: true; property: PropertyContent } | { ok: false; error: string }

const requestedRoomIdSchema = z.string().regex(/^\d+$/).optional()

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
      },
    )
    return { ok: true, property }
  } catch (error) {
    console.error('[landing-builder] Property import failed:', error)
    return { ok: false, error: toImportErrorMessage(error) }
  }
}
