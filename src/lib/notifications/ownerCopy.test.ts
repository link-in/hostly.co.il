import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ sendWhatsAppMessage: vi.fn() }))
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: mocks.sendWhatsAppMessage }))

import { excludeGuestPhone, sendOwnerCopyOfGuestMessage } from './ownerCopy'

beforeEach(() => {
  mocks.sendWhatsAppMessage.mockReset()
  mocks.sendWhatsAppMessage.mockResolvedValue({ success: true, provider: 'mock' })
})

describe('excludeGuestPhone', () => {
  it('removes the guest phone regardless of formatting', () => {
    expect(excludeGuestPhone(['+972524892229', '+972501111111'], '052-489-2229')).toEqual(['+972501111111'])
  })

  it('keeps everyone when the guest has no phone', () => {
    expect(excludeGuestPhone(['+972524892229'], '')).toEqual(['+972524892229'])
  })
})

describe('sendOwnerCopyOfGuestMessage', () => {
  const base = { guestPhone: '0501234567', message: 'שלום דנה!\nקיבלנו את הזמנתך', userId: 'u1', bookingId: 77, guestName: 'דנה' }

  it('sends the exact guest text to every owner phone and logs it as an owner copy', async () => {
    const results = await sendOwnerCopyOfGuestMessage({ ...base, ownerPhones: ['+972524892229', '+972509999999'] })

    expect(results).toHaveLength(2)
    expect(mocks.sendWhatsAppMessage).toHaveBeenCalledTimes(2)
    expect(mocks.sendWhatsAppMessage).toHaveBeenNthCalledWith(
      1,
      { to: '+972524892229', message: base.message },
      expect.objectContaining({ messageType: 'manual_booking_owner_copy', recipientRole: 'owner', bookingId: 77 }),
    )
  })

  it('does not send a duplicate when the owner phone is the guest phone', async () => {
    const results = await sendOwnerCopyOfGuestMessage({ ...base, ownerPhones: ['+972501234567'] })
    expect(results).toEqual([])
    expect(mocks.sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('does nothing when the owner has no phone', async () => {
    expect(await sendOwnerCopyOfGuestMessage({ ...base, ownerPhones: [] })).toEqual([])
    expect(mocks.sendWhatsAppMessage).not.toHaveBeenCalled()
  })
})
