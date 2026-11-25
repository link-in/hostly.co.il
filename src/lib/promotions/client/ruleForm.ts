import {
  DEFAULT_AUDIENCE,
  promotionRuleInputSchema,
  type PromotionRule,
  type PromotionRuleInput,
  type TriggerId,
} from '../domain/types'

/** Raw form values (inputs are strings). */
export interface RuleFormValues {
  name: string
  trigger: TriggerId
  roomId: string
  daysBefore: string
  minFreeNights: string
  dailyBudget: string
  maxTotalBudget: string
  discountPct: string
  ageMin: string
  ageMax: string
  enabled: boolean
}

export const EMPTY_RULE_FORM: RuleFormValues = {
  name: 'סוף שבוע פנוי',
  trigger: 'weekend',
  roomId: '',
  daysBefore: '7',
  minFreeNights: '1',
  dailyBudget: '40',
  maxTotalBudget: '250',
  discountPct: '',
  ageMin: String(DEFAULT_AUDIENCE.ageMin),
  ageMax: String(DEFAULT_AUDIENCE.ageMax),
  enabled: true,
}

export function ruleToForm(rule: PromotionRule): RuleFormValues {
  return {
    name: rule.name,
    trigger: rule.trigger,
    roomId: rule.roomId ?? '',
    daysBefore: String(rule.daysBefore),
    minFreeNights: String(rule.minFreeNights),
    dailyBudget: String(rule.dailyBudget),
    maxTotalBudget: String(rule.maxTotalBudget),
    discountPct: rule.discountPct === null ? '' : String(rule.discountPct),
    ageMin: String(rule.audience.ageMin),
    ageMax: String(rule.audience.ageMax),
    enabled: rule.enabled,
  }
}

function numberOrNaN(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value)
}

export type RuleFormResult = { ok: true; value: PromotionRuleInput } | { ok: false; error: string }

export function parseRuleForm(form: RuleFormValues): RuleFormResult {
  const parsed = promotionRuleInputSchema.safeParse({
    name: form.name,
    trigger: form.trigger,
    roomId: form.roomId || null,
    daysBefore: numberOrNaN(form.daysBefore),
    minFreeNights: numberOrNaN(form.minFreeNights),
    dailyBudget: numberOrNaN(form.dailyBudget),
    maxTotalBudget: numberOrNaN(form.maxTotalBudget),
    discountPct: form.discountPct.trim() ? Number(form.discountPct) : null,
    audience: { ...DEFAULT_AUDIENCE, ageMin: numberOrNaN(form.ageMin), ageMax: numberOrNaN(form.ageMax) },
    channels: ['meta_ads'],
    enabled: form.enabled,
  })
  if (parsed.success) return { ok: true, value: parsed.data }

  const issue = parsed.error.issues[0]
  const field = String(issue.path[0] ?? '')
  const FIELD_ERRORS: Record<string, string> = {
    name: 'צריך לתת שם לחוק',
    daysBefore: 'מספר הימים מראש חייב להיות בין 1 ל-60',
    minFreeNights: 'מספר הלילות המינימלי חייב להיות בין 1 ל-30',
    dailyBudget: 'תקציב יומי לא תקין',
    discountPct: 'הנחה חייבת להיות בין 1 ל-99 אחוז',
    audience: 'טווח הגילאים לא תקין (18–65)',
  }
  return { ok: false, error: FIELD_ERRORS[field] ?? issue.message }
}
