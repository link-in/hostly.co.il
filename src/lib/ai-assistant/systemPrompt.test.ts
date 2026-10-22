import { describe, it, expect } from 'vitest'
import type { AssistantContext } from './context'
import { buildSystemPrompt, buildUpcomingDays } from './systemPrompt'

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

// 21:30 UTC on Oct 22 is already Oct 23 in Israel.
const lateEvening = new Date('2026-10-22T21:30:00Z')

describe('buildUpcomingDays', () => {
  it('labels each date with its Hebrew weekday', () => {
    expect(buildUpcomingDays('2026-10-22', 3)).toEqual([
      '2026-10-22 (יום חמישי)',
      '2026-10-23 (יום שישי)',
      '2026-10-24 (יום שבת)',
    ])
  })

  it('covers two weeks by default and crosses month boundaries', () => {
    const days = buildUpcomingDays('2026-10-25')
    expect(days).toHaveLength(14)
    expect(days[13]).toBe('2026-11-07 (יום שבת)')
  })
})

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt(context, lateEvening)

  it("uses today's date in Israel, not UTC", () => {
    expect(prompt).toContain('Today is 2026-10-23 in Israel')
    expect(prompt).toContain('2026-10-23 (יום שישי)')
  })

  it("lists only the user's own property and rooms", () => {
    expect(prompt).toContain('property_id 306559')
    expect(prompt).toContain('room_id 638851: נוף הרים')
    expect(prompt).toContain('room_id 672381: חדר שני')
  })

  it('states the confirmation rule and the check-out convention', () => {
    expect(prompt).toContain('Never say a change was made')
    expect(prompt).toContain('The check-out night is NOT included')
  })

  it('adapts formatting to the channel', () => {
    expect(prompt).toContain('web chat')
    expect(buildSystemPrompt({ ...context, channel: 'whatsapp' }, lateEvening)).toContain('plain text only')
  })

  it('omits the name line when there is no display name', () => {
    expect(buildSystemPrompt({ ...context, displayName: '' }, lateEvening)).not.toContain("user's name")
  })
})
