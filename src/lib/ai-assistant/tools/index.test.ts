import { vi, describe, it, expect } from 'vitest'
import type { AssistantContext } from '../context'
import { buildAssistantTools, buildReadTools } from './index'
import { checkAvailability } from './checkAvailability'

vi.mock('./checkAvailability', () => ({ checkAvailability: vi.fn(async () => ({ ok: true })) }))

const context: AssistantContext = {
  userId: 'user-1',
  displayName: 'דלית',
  channel: 'web',
  properties: [{ propertyId: 306559, rooms: [{ roomId: 638851, name: 'נוף הרים' }] }],
}

const options = { toolCallId: 'call-1', messages: [], context: {} }

describe('buildReadTools', () => {
  it('exposes only the read tools', () => {
    expect(Object.keys(buildReadTools(context))).toEqual(['list_properties', 'check_availability'])
  })

  it('exposes the read and write tools together', () => {
    expect(Object.keys(buildAssistantTools(context))).toEqual([
      'list_properties',
      'check_availability',
      'block_dates',
      'update_price',
    ])
  })

  it('list_properties returns the IDs from the context', async () => {
    const tools = buildReadTools(context)
    expect(await tools.list_properties.execute!({}, options)).toEqual({
      ok: true,
      properties: [{ propertyId: 306559, rooms: [{ roomId: 638851, name: 'נוף הרים' }] }],
    })
  })

  it('check_availability runs against the bound context', async () => {
    const tools = buildReadTools(context)
    const input = { start_date: '2026-11-05', end_date: '2026-11-07' }
    await tools.check_availability.execute!(input, options)
    expect(checkAvailability).toHaveBeenCalledWith(context, input)
  })
})
