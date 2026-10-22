import { vi, describe, it, expect } from 'vitest'
import type { AssistantContext } from '../context'
import type { ProposalDeps } from './proposeAction'
import { proposeBlockDates } from './proposeBlockDates'
import { proposeUpdatePrice } from './proposeUpdatePrice'

const today = '2026-10-22'

const context: AssistantContext = {
  userId: 'user-1',
  displayName: 'דלית',
  channel: 'web',
  properties: [
    {
      propertyId: 306559,
      rooms: [
        { roomId: 638851, name: 'נוף הרים' },
        { roomId: 672381, name: 'חדר שני' },
      ],
    },
  ],
}

function makeDeps(): ProposalDeps {
  return {
    createPendingAction: vi.fn<ProposalDeps['createPendingAction']>(async () => ({
      id: 'action-1',
      expiresAt: '2026-10-22T19:00:00.000Z',
    })),
  }
}

const stay = { room_id: 638851, start_date: '2026-10-29', end_date: '2026-10-31' }

describe('proposeBlockDates', () => {
  it('saves a pending block for the exact nights and awaits confirmation', async () => {
    const deps = makeDeps()
    const result = await proposeBlockDates(context, { ...stay, reason: 'שיפוץ' }, deps, today)

    const expectedAction = {
      actionType: 'block_dates',
      payload: {
        propertyId: 306559,
        roomId: 638851,
        roomName: 'נוף הרים',
        from: '2026-10-29',
        to: '2026-10-30',
        checkIn: '2026-10-29',
        checkOut: '2026-10-31',
        nights: 2,
        reason: 'שיפוץ',
      },
    }
    expect(deps.createPendingAction).toHaveBeenCalledWith('user-1', 'web', expectedAction)
    expect(result).toMatchObject({ ok: true, status: 'awaiting_confirmation', actionId: 'action-1', action: expectedAction })
  })

  it('asks which room instead of guessing', async () => {
    const deps = makeDeps()
    const result = await proposeBlockDates(context, { ...stay, room_id: undefined, reason: 'שיפוץ' }, deps, today)
    expect(result).toMatchObject({ ok: false, code: 'room_required' })
    expect(deps.createPendingAction).not.toHaveBeenCalled()
  })

  it("refuses another user's room", async () => {
    const deps = makeDeps()
    const result = await proposeBlockDates(context, { ...stay, room_id: 1, reason: 'x' }, deps, today)
    expect(result).toMatchObject({ ok: false, code: 'room_not_owned' })
    expect(deps.createPendingAction).not.toHaveBeenCalled()
  })

  it('refuses past nights', async () => {
    const deps = makeDeps()
    const result = await proposeBlockDates(context, { ...stay, start_date: '2026-10-20', reason: 'x' }, deps, today)
    expect(result).toMatchObject({ ok: false, code: 'invalid_input' })
    expect(deps.createPendingAction).not.toHaveBeenCalled()
  })
})

describe('proposeUpdatePrice', () => {
  it('saves the unmultiplied base price with a channel preview', async () => {
    const deps = makeDeps()
    const result = await proposeUpdatePrice(context, { ...stay, new_price: 800 }, deps, today)

    expect(result.ok).toBe(true)
    if (!result.ok || result.action.actionType !== 'update_price') throw new Error('expected a price proposal')
    expect(result.action.payload.newPrice).toBe(800)
    expect(result.action.payload.channelPrices).toEqual([
      { channelKey: 'airbnb', name: 'Airbnb', price: 968 },
      { channelKey: 'booking', name: 'Booking.com', price: 968 },
      { channelKey: 'direct', name: 'הזמנה ישירה', price: 800 },
    ])
  })

  it('rounds the price to whole shekels', async () => {
    const deps = makeDeps()
    const result = await proposeUpdatePrice(context, { ...stay, new_price: 799.6 }, deps, today)
    expect(result.ok && result.action.payload).toMatchObject({ newPrice: 800 })
  })

  it('uses the channel from the context', async () => {
    const deps = makeDeps()
    await proposeUpdatePrice({ ...context, channel: 'whatsapp' }, { ...stay, new_price: 500 }, deps, today)
    expect(deps.createPendingAction).toHaveBeenCalledWith('user-1', 'whatsapp', expect.anything())
  })
})
