import type { DashboardProvider } from '@/lib/dashboard/types'
import { createBeds24Provider } from '@/lib/dashboard/providers/beds24'
import { createMockProvider, mockDashboardProvider } from '@/lib/dashboard/providers/mock'
import type { AuthUser } from '@/lib/auth/types'

type ProviderMeta = {
  name: 'mock' | 'beds24'
  label: string
  isMock: boolean
}

/**
 * Get dashboard provider based on user and environment.
 * Pass `roomId` to scope data fetching to a specific room (multi-room support).
 * Demo users always get mock data regardless of roomId.
 */
export const getDashboardProvider = (
  user?: AuthUser,
  roomId?: string
): { provider: DashboardProvider; meta: ProviderMeta } => {
  // If user is demo, always use mock provider (scoped to selected room if provided)
  if (user?.isDemo) {
    console.log('🎭 Demo user detected - using mock provider', roomId ? `(room: ${roomId})` : '(all rooms)')
    return {
      provider: createMockProvider(roomId),
      meta: {
        name: 'mock',
        label: 'Demo Mode',
        isMock: true,
      },
    }
  }

  const providerName = (process.env.NEXT_PUBLIC_DASHBOARD_PROVIDER ?? 'beds24').toLowerCase()

  if (providerName === 'beds24') {
    return {
      provider: createBeds24Provider({
        baseUrl: process.env.NEXT_PUBLIC_BEDS24_BASE_URL,
        roomId,
      }),
      meta: {
        name: 'beds24',
        label: 'Beds24',
        isMock: false,
      },
    }
  }

  return {
    provider: mockDashboardProvider,
    meta: {
      name: 'mock',
      label: 'Mock data',
      isMock: true,
    },
  }
}
