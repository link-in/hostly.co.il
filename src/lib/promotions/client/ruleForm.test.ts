import { describe, expect, it } from 'vitest'
import { EMPTY_RULE_FORM, parseRuleForm, ruleToForm } from './ruleForm'

describe('parseRuleForm', () => {
  it('turns the default form into a valid rule for all rooms on Meta', () => {
    expect(parseRuleForm(EMPTY_RULE_FORM)).toEqual({
      ok: true,
      value: {
        name: 'סוף שבוע פנוי',
        trigger: 'weekend',
        roomId: null,
        daysBefore: 7,
        minFreeNights: 1,
        dailyBudget: 40,
        maxTotalBudget: 250,
        discountPct: null,
        audience: { countries: ['IL'], ageMin: 21, ageMax: 65 },
        channels: ['meta_ads'],
        enabled: true,
      },
    })
  })

  it.each([
    [{ daysBefore: '' }, 'ימים מראש'],
    [{ daysBefore: '90' }, 'ימים מראש'],
    [{ dailyBudget: '0' }, 'תקציב יומי'],
    [{ maxTotalBudget: '10' }, 'התקציב הכולל'],
    [{ discountPct: '120' }, 'הנחה'],
    [{ ageMin: '40', ageMax: '30' }, 'גילאים'],
    [{ name: '  ' }, 'שם'],
  ])('reports a readable error for %o', (override, message) => {
    const result = parseRuleForm({ ...EMPTY_RULE_FORM, ...override })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain(message)
  })

  it('round-trips a saved rule', () => {
    const parsed = parseRuleForm({ ...EMPTY_RULE_FORM, roomId: 'r1', discountPct: '15', trigger: 'custom_window' })
    if (!parsed.ok) throw new Error(parsed.error)
    const form = ruleToForm({ ...parsed.value, id: 'x', userId: 'u1' })
    expect(parseRuleForm(form)).toEqual(parsed)
  })
})
