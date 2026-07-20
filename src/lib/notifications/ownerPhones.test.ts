/**
 * Tests for the shared owner-notification helpers.
 *
 * These back the "secondary phone number" feature: a co-host/manager phone
 * that should receive the exact same owner-facing WhatsApp messages as the
 * primary owner phone (new booking from webhook/direct-website, check-in
 * completed).
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { buildOwnerPhoneList, sendWhatsAppToAll } from './ownerPhones'

vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: vi.fn() }))

import { sendWhatsAppMessage } from '@/lib/whatsapp'

describe('buildOwnerPhoneList', () => {
  it('normalizes a single Israeli-format phone number', () => {
    expect(buildOwnerPhoneList('0528676516')).toEqual(['+972528676516'])
  })

  it('includes both primary and secondary numbers when both are set', () => {
    expect(buildOwnerPhoneList('0528676516', '0501234567')).toEqual([
      '+972528676516',
      '+972501234567',
    ])
  })

  it('omits missing/empty/whitespace-only numbers', () => {
    expect(buildOwnerPhoneList('0528676516', null, undefined, '', '   ')).toEqual([
      '+972528676516',
    ])
  })

  it('returns an empty array when nothing is configured', () => {
    expect(buildOwnerPhoneList(null, undefined, '')).toEqual([])
  })

  it('deduplicates when primary and secondary are the same number in different formats', () => {
    expect(buildOwnerPhoneList('0528676516', '+972528676516')).toEqual(['+972528676516'])
  })
})

describe('sendWhatsAppToAll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends the same message to every phone and returns per-recipient results', async () => {
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({ success: true, provider: 'mock' })

    const results = await sendWhatsAppToAll(['+972500000001', '+972500000002'], 'hello')

    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(2)
    expect(sendWhatsAppMessage).toHaveBeenNthCalledWith(1, { to: '+972500000001', message: 'hello' })
    expect(sendWhatsAppMessage).toHaveBeenNthCalledWith(2, { to: '+972500000002', message: 'hello' })
    expect(results).toEqual([
      { to: '+972500000001', success: true, provider: 'mock' },
      { to: '+972500000002', success: true, provider: 'mock' },
    ])
  })

  it('captures a per-recipient failure without short-circuiting the rest', async () => {
    vi.mocked(sendWhatsAppMessage)
      .mockResolvedValueOnce({ success: false, provider: 'mock', error: 'HTTP 401' })
      .mockResolvedValueOnce({ success: true, provider: 'mock' })

    const results = await sendWhatsAppToAll(['+972500000001', '+972500000002'], 'hello')

    expect(results[0]).toMatchObject({ to: '+972500000001', success: false, error: 'HTTP 401' })
    expect(results[1]).toMatchObject({ to: '+972500000002', success: true })
  })

  it('does nothing for an empty phone list', async () => {
    const results = await sendWhatsAppToAll([], 'hello')
    expect(results).toEqual([])
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })
})
