import { describe, it, expect } from 'vitest'
import {
  buildArrivalCaption,
  buildHouseRulesMessage,
  type ArrivalMessageInput,
} from './message'

const base: ArrivalMessageInput = {
  guestName: 'ישראל ישראלי',
  propertyName: 'ווילה בכינרת',
  introText: 'כניסה עם קוד 1234',
  wazeLink: 'https://waze.com/ul?ll=32.8,35.5',
  houseRules: 'אין עישון. שקט אחרי 23:00.',
}

describe('buildArrivalCaption', () => {
  it('includes greeting with guest name and property name', () => {
    const caption = buildArrivalCaption(base)
    expect(caption).toContain('ישראל ישראלי')
    expect(caption).toContain('ווילה בכינרת')
  })

  it('includes intro text when provided', () => {
    const caption = buildArrivalCaption(base)
    expect(caption).toContain('כניסה עם קוד 1234')
  })

  it('includes Waze link when provided', () => {
    const caption = buildArrivalCaption(base)
    expect(caption).toContain('https://waze.com/ul?ll=32.8,35.5')
  })

  it('omits intro text section when introText is null', () => {
    const caption = buildArrivalCaption({ ...base, introText: null })
    expect(caption).not.toContain('כניסה עם קוד')
    // Still has waze
    expect(caption).toContain('Waze')
  })

  it('omits Waze section when wazeLink is null', () => {
    const caption = buildArrivalCaption({ ...base, wazeLink: null })
    expect(caption).not.toContain('Waze')
    expect(caption).toContain('כניסה עם קוד 1234')
  })

  it('result length is at most 900 chars even with long intro', () => {
    const longIntro = 'א'.repeat(2000)
    const caption = buildArrivalCaption({ ...base, introText: longIntro })
    expect(caption.length).toBeLessThanOrEqual(900)
  })

  it('handles all nullable fields gracefully', () => {
    const caption = buildArrivalCaption({
      guestName: 'שרה',
      propertyName: 'בקתה',
      introText: null,
      wazeLink: null,
      houseRules: null,
    })
    expect(caption).toContain('שרה')
    expect(caption).toContain('בקתה')
  })
})

describe('buildHouseRulesMessage', () => {
  it('always returns null — content is now merged into the caption', () => {
    expect(buildHouseRulesMessage(base)).toBeNull()
  })

  it('returns null when houseRules is null', () => {
    expect(buildHouseRulesMessage({ ...base, houseRules: null })).toBeNull()
  })

  it('returns null when houseRules is empty string', () => {
    expect(buildHouseRulesMessage({ ...base, houseRules: '' })).toBeNull()
  })

  it('returns null when houseRules is only whitespace', () => {
    expect(buildHouseRulesMessage({ ...base, houseRules: '   ' })).toBeNull()
  })
})
