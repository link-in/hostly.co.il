import type { DashboardProvider } from '@/lib/dashboard/types'
import { createBeds24Provider } from '@/lib/dashboard/providers/beds24'
import { mockDashboardProvider } from '@/lib/dashboard/providers/mock'
import type { AuthUser } from '@/lib/auth/types'

type ProviderMeta = {
  name: 'mock' | 'beds24'
  label: string
  isMock: boolean
}

/**
 * Get dashboard provider based on user and environment
 * Demo users always get mock data, others use configured provider
 */
export const getDashboardProvider = (user?: AuthUser): { provider: DashboardProvider; meta: ProviderMeta } => {
  // If user is demo, always use mock provider
  if (user?.isDemo) {
    console.log('🎭 Demo user detected - using mock provider')
    return {
      provider: mockDashboardProvider,
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
