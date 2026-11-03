import { vi, describe, it, expect } from 'vitest'
import type { AssistantContext } from '../context'
import type { AvailabilityByDate, Beds24Result, PriceByDate } from '../beds24/types'
import { checkAvailability, type CheckAvailabilityDeps } from './checkAvailability'

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

function makeDeps(overrides: {
  availability?: Record<number, Beds24Result<AvailabilityByDate>>
  prices?: Record<number, Beds24Result<PriceByDate>>
  manualBlocks?: Record<number, string[]>
} = {}): CheckAvailabilityDeps {
  const empty = { ok: true, data: {} } as const
  return {
    fetchRoomAvailability: vi.fn<CheckAvailabilityDeps['fetchRoomAvailability']>(
      async (target) => overrides.availability?.[target.roomId] ?? empty,
    ),
    fetchRoomPrices: vi.fn<CheckAvailabilityDeps['fetchRoomPrices']>(async (target) => overrides.prices?.[target.roomId] ?? empty),
    applyManualBlocks: vi.fn<CheckAvailabilityDeps['applyManualBlocks']>(async (_userId, roomId, nights, availability) => {
      const blocked = new Set(overrides.manualBlocks?.[roomId] ?? [])
      return Object.fromEntries(nights.map((d) => [d, availability[d] !== false && !blocked.has(d)]))
    }),
  }
}

const stay = { start_date: '2026-11-05', end_date: '2026-11-08' }

describe('checkAvailability', () => {
  it('checks every room for the nights of the stay, excluding check-out', async () => {
    const deps = makeDeps({
      availability: { 638851: { ok: true, data: { '2026-11-06': false } } },
      prices: { 638851: { ok: true, data: { '2026-11-05': 600, '2026-11-06': 600 } } },
    })

    const result = await checkAvailability(context, stay, deps)

    expect(deps.fetchRoomAvailability).toHaveBeenCalledWith(
      { userId: 'user-1', propertyId: 306559, roomId: 638851 },
      { from: '2026-11-05', to: '2026-11-07' },
    )
    expect(result).toEqual({
      ok: true,
      propertyId: 306559,
      checkIn: '2026-11-05',
      checkOut: '2026-11-08',
      nights: 3,
      rooms: [
        {
          roomId: 638851,
          roomName: 'נוף הרים',
          fullyAvailable: false,
          availableStays: [
            { checkIn: '2026-11-05', checkOut: '2026-11-06' },
            { checkIn: '2026-11-07', checkOut: '2026-11-08' },
          ],
          unavailableNights: ['2026-11-06'],
          nightlyPrices: { '2026-11-05': 600, '2026-11-06': 600, '2026-11-07': null },
        },
        {
          roomId: 672381,
          roomName: 'חדר שני',
          fullyAvailable: true,
          availableStays: [{ checkIn: '2026-11-05', checkOut: '2026-11-08' }],
          unavailableNights: [],
          nightlyPrices: { '2026-11-05': null, '2026-11-06': null, '2026-11-07': null },
        },
      ],
    })
  })

  it('treats dashboard manual blocks as unavailable', async () => {
    const deps = makeDeps({ manualBlocks: { 638851: ['2026-11-07'] } })
    const result = await checkAvailability(context, { ...stay, room_id: 638851 }, deps)
    expect(result.ok && result.rooms[0].unavailableNights).toEqual(['2026-11-07'])
  })

  it("refuses another user's room without calling Beds24", async () => {
    const deps = makeDeps()
    const result = await checkAvailability(context, { ...stay, room_id: 123 }, deps)
    expect(result).toMatchObject({ ok: false, code: 'room_not_owned' })
    expect(deps.fetchRoomAvailability).not.toHaveBeenCalled()
  })

  it.each([
    ['check-out before check-in', { start_date: '2026-11-08', end_date: '2026-11-05' }],
    ['same-day stay', { start_date: '2026-11-05', end_date: '2026-11-05' }],
    ['impossible date', { start_date: '2026-02-30', end_date: '2026-03-02' }],
    ['more than 92 nights', { start_date: '2026-11-01', end_date: '2027-02-02' }],
  ])('rejects %s without calling Beds24', async (_label, dates) => {
    const deps = makeDeps()
    const result = await checkAvailability(context, dates, deps)
    expect(result).toMatchObject({ ok: false, code: 'invalid_input' })
    expect(deps.fetchRoomAvailability).not.toHaveBeenCalled()
  })

  it('surfaces a Beds24 failure as a tool failure', async () => {
    const deps = makeDeps({
      prices: { 672381: { ok: false, error: { kind: 'credit', message: 'No credit', status: 402 } } },
    })
    const result = await checkAvailability(context, stay, deps)
    expect(result).toEqual({ ok: false, code: 'beds24_credit', message: 'No credit' })
  })
})
