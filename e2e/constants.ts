/**
 * Shared between `playwright.config.ts` (passed to the spawned `next start`
 * process) and the specs (used to encode a matching session JWT). Using a
 * fixed test-only secret means the E2E suite never depends on whatever
 * NEXTAUTH_SECRET happens to be in a developer's `.env.local`.
 */
export const E2E_NEXTAUTH_SECRET = 'e2e-test-nextauth-secret-do-not-use-in-prod'

export const E2E_DEMO_USER = {
  id: 'e2e-demo-user',
  email: 'e2e-demo@hostly.co.il',
  displayName: 'E2E Demo',
  propertyId: 'DEMO_PROPERTY',
  roomId: 'DEMO_ROOM_001',
  role: 'owner' as const,
  isDemo: true,
  subscriptionStatus: 'active' as const,
}
