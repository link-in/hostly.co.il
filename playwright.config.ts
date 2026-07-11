import { defineConfig, devices } from '@playwright/test'
import { E2E_NEXTAUTH_SECRET } from './e2e/constants'

const PORT = 3100
const baseURL = `http://localhost:${PORT}`

/**
 * Intentionally small, mocked E2E suite (no live Beds24/Supabase calls — see
 * e2e/calendar-blocking.spec.ts). Runs against a production build so it also
 * catches build-time regressions before merge, mirroring the `next build`
 * step in CI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXTAUTH_URL: baseURL,
      NEXTAUTH_SECRET: E2E_NEXTAUTH_SECRET,
    },
  },
})
