import { describe, expect, it } from 'vitest'
import { DEMO_PROPERTY } from './demoProperty'
import { propertyContentSchema } from './types'

describe('DEMO_PROPERTY', () => {
  it('satisfies the import contract the real Supabase import must also meet', () => {
    expect(propertyContentSchema.safeParse(DEMO_PROPERTY).success).toBe(true)
  })
})
