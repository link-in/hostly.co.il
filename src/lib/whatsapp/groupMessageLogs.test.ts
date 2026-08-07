import { describe, it, expect } from 'vitest'
import { groupWhatsAppMessageLogs } from './groupMessageLogs'
import type { WhatsAppMessageLogRow } from '@/lib/db/whatsappMessages'

function row(overrides: Partial<WhatsAppMessageLogRow>): WhatsAppMessageLogRow {
  return {
    id: 'id-1',
    user_id: 'user-1',
    booking_id: '42',
    message_type: 'booking_request_owner',
    recipient_role: 'owner',
    recipient_phone: '+972521111111',
    recipient_name: 'Guest',
    message_body: '📩 בקשת הזמנה חדשה',
    status: 'sent',
    provider: 'whapi',
    provider_message_id: 'msg-1',
    error: null,
    created_at: '2026-08-07T10:00:00.000Z',
    ...overrides,
  }
}

describe('groupWhatsAppMessageLogs', () => {
  it('merges the same booking message sent to two owner phones', () => {
    const groups = groupWhatsAppMessageLogs([
      row({ id: 'a', recipient_phone: '+972521111111', provider_message_id: 'm1' }),
      row({
        id: 'b',
        recipient_phone: '+972522222222',
        provider_message_id: 'm2',
        created_at: '2026-08-07T10:00:01.000Z',
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].recipients).toHaveLength(2)
    expect(groups[0].recipients.map((r) => r.phone)).toEqual(
      expect.arrayContaining(['+972521111111', '+972522222222']),
    )
  })

  it('keeps guest and owner messages separate', () => {
    const groups = groupWhatsAppMessageLogs([
      row({
        id: 'guest',
        message_type: 'new_booking_guest',
        recipient_role: 'guest',
        message_body: 'שלום אורח',
      }),
      row({
        id: 'owner',
        message_type: 'new_booking_owner',
        recipient_role: 'owner',
        message_body: 'הזמנה חדשה',
      }),
    ])

    expect(groups).toHaveLength(2)
  })

  it('marks status as partial when one recipient fails', () => {
    const groups = groupWhatsAppMessageLogs([
      row({ id: 'ok', status: 'sent', recipient_phone: '+972521111111' }),
      row({
        id: 'bad',
        status: 'failed',
        recipient_phone: '+972522222222',
        error: 'timeout',
      }),
    ])

    expect(groups[0].status).toBe('partial')
  })

  it('does not merge different booking ids with the same body', () => {
    const groups = groupWhatsAppMessageLogs([
      row({ id: 'a', booking_id: '1' }),
      row({ id: 'b', booking_id: '2' }),
    ])

    expect(groups).toHaveLength(2)
  })
})
