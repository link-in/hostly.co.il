import { DEMO_PROPERTY } from '@/lib/landingBuilder/demoProperty'
import { propertyContentSchema, type PropertyContent } from '@/lib/landingBuilder/types'

/**
 * Phase 4 replaces the body with a server action that reads the user's synced
 * property from Supabase; callers already treat it as async and fallible.
 */
export async function importPropertyContent(): Promise<PropertyContent> {
  return propertyContentSchema.parse(DEMO_PROPERTY)
}
