/**
 * Unit tests for arrival-messages service helpers.
 * All external I/O (Beds24, Supabase, WhatsApp) is mocked at the top level.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Top-level mocks (hoisted before imports) ─────────────────────────────

const mockIsAlreadyProcessed = vi.fn()
const mockInsertLog = vi.fn()
const mockGetSettings = vi.fn()
const mockSend = vi.fn()

vi.mock('@/lib/db/arrivalMessages', () => ({
  isArrivalMessageAlreadyProcessed: (...args: unknown[]) => mockIsAlreadyProcessed(...args),
  insertArrivalMessageLog: (...args: unknown[]) => mockInsertLog(...args),
  getArrivalMessageSettings: (...args: unknown[]) => mockGetSettings(...args),
}))

vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: (...args: unknown[]) => mockSend(...args),
}))

vi.mock('@/lib/beds24/tokenManager', () => ({
  fetchWithTokenRefresh: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      {
        id: 'BK001',
        status: 'confirmed',
        firstName: 'ישראל',
        lastName: 'ישראלי',
        mobile: '+972501234567',
      },
    ],
  }),
}))

vi.mock('@/lib/bookings/normalizer', () => ({
  isConfirmedBookingStatus: (s: string) => s === 'confirmed',
}))

vi.mock('@/lib/utils/phoneFormatter', () => ({
  normalizePhoneNumber: (p: string) => p,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────

const fakeUser = {
  id: 'user-1',
  propertyId: 'prop-1',
  displayName: 'ווילה בכינרת',
  googleReviewUrl: null,
  beds24Token: 'tok',
  beds24RefreshToken: 'ref',
}

const enabledSettings = {
  userId: 'user-1',
  enabled: true,
  photoUrl: 'https://example.com/photo.jpg',
  photoStoragePath: 'user-1/arrival/photo.jpg',
  introText: 'קוד כניסה 1234',
  wazeLink: 'https://waze.com/ul',
  houseRules: null,
  updatedAt: new Date().toISOString(),
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('processArrivalMessagesForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertLog.mockResolvedValue({ id: 'log-1', error: null })
    mockSend.mockResolvedValue({ success: true, provider: 'whapi' })
  })

  it('skips entirely when settings.enabled is false', async () => {
    mockGetSettings.mockResolvedValue({ ...enabledSettings, enabled: false })

    const { processArrivalMessagesForUser } = await import('./service')
    const summary = await processArrivalMessagesForUser(fakeUser, '2026-09-06')

    expect(summary.sent).toBe(0)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('skips entirely when photoUrl is missing', async () => {
    mockGetSettings.mockResolvedValue({ ...enabledSettings, photoUrl: null })

    const { processArrivalMessagesForUser } = await import('./service')
    const summary = await processArrivalMessagesForUser(fakeUser, '2026-09-06')

    expect(summary.sent).toBe(0)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('skips already-processed booking (dedup)', async () => {
    mockGetSettings.mockResolvedValue(enabledSettings)
    mockIsAlreadyProcessed.mockResolvedValue(true)

    const { processArrivalMessagesForUser } = await import('./service')
    const summary = await processArrivalMessagesForUser(fakeUser, '2026-09-06')

    expect(summary.skipped).toBe(1)
    expect(summary.sent).toBe(0)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('sends message and logs success', async () => {
    mockGetSettings.mockResolvedValue(enabledSettings)
    mockIsAlreadyProcessed.mockResolvedValue(false)

    const { processArrivalMessagesForUser } = await import('./service')
    const summary = await processArrivalMessagesForUser(fakeUser, '2026-09-06')

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockInsertLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', bookingId: 'BK001' }),
    )
    expect(summary.sent).toBe(1)
    expect(summary.failed).toBe(0)
  })

  it('logs failure when send returns success=false', async () => {
    mockGetSettings.mockResolvedValue(enabledSettings)
    mockIsAlreadyProcessed.mockResolvedValue(false)
    mockSend.mockResolvedValue({ success: false, error: 'provider error', provider: 'whapi' })

    const { processArrivalMessagesForUser } = await import('./service')
    const summary = await processArrivalMessagesForUser(fakeUser, '2026-09-06')

    expect(mockInsertLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', whatsappError: 'provider error' }),
    )
    expect(summary.failed).toBe(1)
    expect(summary.sent).toBe(0)
  })
})
