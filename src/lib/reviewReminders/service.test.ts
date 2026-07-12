/**
 * Integration-style tests for `processReviewRemindersForUser()`.
 * Beds24 (`fetchWithTokenRefresh`), WhatsApp, and the review-reminders log are
 * all mocked with `vi.mock`, matching the pattern used in
 * `src/lib/webhook/processor.integration.test.ts`. No real network/DB call happens here.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { isReviewReminderAlreadyProcessed, insertReviewReminderLog } from '@/lib/db/reviewReminders'
import { processReviewRemindersForUser } from './service'
import type { UserWithBeds24Access } from '@/lib/db/users'
import { BEDS24_PROPERTY_ID } from '@/__tests__/fixtures/beds24'

vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: vi.fn() }))
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: vi.fn() }))
vi.mock('@/lib/db/reviewReminders', () => ({
  isReviewReminderAlreadyProcessed: vi.fn(),
  insertReviewReminderLog: vi.fn(),
}))

const DATE_STR = '2026-07-10'

const TEST_USER: UserWithBeds24Access = {
  id: 'user-1',
  propertyId: String(BEDS24_PROPERTY_ID),
  displayName: 'Mountain View',
  googleReviewUrl: 'https://g.page/r/abc123',
  beds24Token: 'token',
  beds24RefreshToken: 'refresh',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function buildBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    status: 'confirmed',
    firstName: 'Yossi',
    lastName: 'Cohen',
    mobile: '0521234567',
    departure: DATE_STR,
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(fetchWithTokenRefresh).mockReset()
  vi.mocked(sendWhatsAppMessage).mockReset()
  vi.mocked(isReviewReminderAlreadyProcessed).mockReset()
  vi.mocked(insertReviewReminderLog).mockReset()

  vi.mocked(isReviewReminderAlreadyProcessed).mockResolvedValue(false)
  vi.mocked(insertReviewReminderLog).mockResolvedValue({ id: 'log-1', error: null })
  vi.mocked(sendWhatsAppMessage).mockResolvedValue({ success: true, provider: 'mock' })
})

describe('processReviewRemindersForUser', () => {
  it('sends a Google-review message for a direct/unattributed booking', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(jsonResponse([buildBooking()]))

    const summary = await processReviewRemindersForUser(TEST_USER, DATE_STR)

    expect(summary).toMatchObject({ bookingsFound: 1, sent: 1, skipped: 0, failed: 0 })
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1)
    const [{ message, to }] = vi.mocked(sendWhatsAppMessage).mock.calls[0]
    expect(to).toContain('972')
    expect(message).toContain('https://g.page/r/abc123')
    expect(insertReviewReminderLog).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 100, channel: 'other', status: 'sent' }),
    )
  })

  it('sends an Airbnb-specific message (no Google link) when apiSource is Airbnb', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(
      jsonResponse([buildBooking({ apiSource: 'Airbnb' })]),
    )

    await processReviewRemindersForUser(TEST_USER, DATE_STR)

    const [{ message }] = vi.mocked(sendWhatsAppMessage).mock.calls[0]
    expect(message).toContain('Airbnb')
    expect(message).not.toContain('g.page')
    expect(insertReviewReminderLog).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'airbnb' }),
    )
  })

  it('skips bookings that are not confirmed', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(
      jsonResponse([buildBooking({ status: 'cancelled' })]),
    )

    const summary = await processReviewRemindersForUser(TEST_USER, DATE_STR)

    expect(summary).toMatchObject({ bookingsFound: 1, sent: 0, skipped: 1, failed: 0 })
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
    expect(insertReviewReminderLog).not.toHaveBeenCalled()
  })

  it('skips (and logs) a booking with no guest phone number', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(
      jsonResponse([buildBooking({ mobile: '', phone: '' })]),
    )

    const summary = await processReviewRemindersForUser(TEST_USER, DATE_STR)

    expect(summary).toMatchObject({ sent: 0, skipped: 1, failed: 0 })
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
    expect(insertReviewReminderLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'skipped_no_phone', guestPhone: null }),
    )
  })

  it('skips a booking that was already processed (dedup)', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(jsonResponse([buildBooking()]))
    vi.mocked(isReviewReminderAlreadyProcessed).mockResolvedValue(true)

    const summary = await processReviewRemindersForUser(TEST_USER, DATE_STR)

    expect(summary).toMatchObject({ sent: 0, skipped: 1, failed: 0 })
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
    expect(insertReviewReminderLog).not.toHaveBeenCalled()
  })

  it('counts a failed WhatsApp send and logs the error', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(jsonResponse([buildBooking()]))
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({
      success: false,
      provider: 'mock',
      error: 'boom',
    })

    const summary = await processReviewRemindersForUser(TEST_USER, DATE_STR)

    expect(summary).toMatchObject({ sent: 0, failed: 1, skipped: 0 })
    expect(insertReviewReminderLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', whatsappError: 'boom' }),
    )
  })

  it('returns an empty summary (no throw) when the Beds24 request fails', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(jsonResponse({ error: 'boom' }, 500))

    const summary = await processReviewRemindersForUser(TEST_USER, DATE_STR)

    expect(summary).toMatchObject({ bookingsFound: 0, sent: 0, skipped: 0, failed: 0 })
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('processes multiple bookings independently in one run', async () => {
    vi.mocked(fetchWithTokenRefresh).mockResolvedValue(
      jsonResponse([
        buildBooking({ id: 1 }),
        buildBooking({ id: 2, apiSource: 'Booking.com' }),
        buildBooking({ id: 3, status: 'cancelled' }),
      ]),
    )

    const summary = await processReviewRemindersForUser(TEST_USER, DATE_STR)

    expect(summary).toMatchObject({ bookingsFound: 3, sent: 2, skipped: 1, failed: 0 })
  })
})
