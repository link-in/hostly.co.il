import type { PropertyContent } from '@/lib/landingBuilder/types'
import { importPropertyContentAction } from '../actions'

/** Imports the signed-in user's property; throws with a user-facing Hebrew message on failure. */
export async function importPropertyContent(roomId?: string): Promise<PropertyContent> {
  const result = await importPropertyContentAction(roomId)
  if (!result.ok) throw new Error(result.error)
  return result.property
}
