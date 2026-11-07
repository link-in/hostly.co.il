import { describe, it, expect } from 'vitest'
import { formatCleaningNotesTag, updateNotesWithCleaning } from './cleaningNotes'

describe('cleaningNotes utility', () => {
  describe('formatCleaningNotesTag', () => {
    it('formats tag with cleaning cost only', () => {
      expect(formatCleaningNotesTag(250)).toBe('[עלות ניקיון: ₪250]')
    })

    it('formats tag with cleaning cost and cleaner name', () => {
      expect(formatCleaningNotesTag(300, 'מרים')).toBe('[עלות ניקיון: ₪300, מנקה: מרים]')
    })

    it('trims whitespace around cleaner name', () => {
      expect(formatCleaningNotesTag(200, '  שרה כהן  ')).toBe('[עלות ניקיון: ₪200, מנקה: שרה כהן]')
    })

    it('ignores empty cleaner name', () => {
      expect(formatCleaningNotesTag(150, '   ')).toBe('[עלות ניקיון: ₪150]')
    })
  })

  describe('updateNotesWithCleaning', () => {
    it('appends cleaning tag to empty notes when cost > 0', () => {
      const result = updateNotesWithCleaning('', 250, 'מרים', true)
      expect(result).toBe('[עלות ניקיון: ₪250, מנקה: מרים]')
    })

    it('appends cleaning tag to existing notes without tag', () => {
      const initial = 'אורח מגיע בשעה 14:00'
      const result = updateNotesWithCleaning(initial, 300, 'יוסי', true)
      expect(result).toBe('אורח מגיע בשעה 14:00\n[עלות ניקיון: ₪300, מנקה: יוסי]')
    })

    it('replaces existing cleaning tag with updated cost and cleaner name', () => {
      const initial = 'אורח מגיע בשעה 14:00\n[עלות ניקיון: ₪200, מנקה: דני]'
      const result = updateNotesWithCleaning(initial, 350, 'אולגה', true)
      expect(result).toBe('אורח מגיע בשעה 14:00\n[עלות ניקיון: ₪350, מנקה: אולגה]')
    })

    it('replaces existing cleanerCost English tag', () => {
      const initial = 'Late checkin requested\n[cleanerCost: 180]'
      const result = updateNotesWithCleaning(initial, 250, 'מרים', true)
      expect(result).toBe('Late checkin requested\n[עלות ניקיון: ₪250, מנקה: מרים]')
    })

    it('removes cleaning tag when cost is 0', () => {
      const initial = 'אורח מבקש מגבות\n[עלות ניקיון: ₪250, מנקה: מרים]'
      const result = updateNotesWithCleaning(initial, 0, undefined, false)
      expect(result).toBe('אורח מבקש מגבות')
    })

    it('removes cleaning tag when hasCleaning is false', () => {
      const initial = 'הערה כלשהי\n[עלות ניקיון: ₪300]'
      const result = updateNotesWithCleaning(initial, 300, undefined, false)
      expect(result).toBe('הערה כלשהי')
    })

    it('returns empty string when notes only contained the tag and cleaning is removed', () => {
      const initial = '[עלות ניקיון: ₪250, מנקה: מרים]'
      const result = updateNotesWithCleaning(initial, 0, undefined, false)
      expect(result).toBe('')
    })
  })
})
