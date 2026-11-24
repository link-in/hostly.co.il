import { NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/onboarding/http'
import { demoForbidden, getHostSession, serverError, unauthorized } from '@/lib/promotions/api/http'
import { promotionRuleInputSchema } from '@/lib/promotions/domain/types'
import { deleteRule, updateRule } from '@/lib/promotions/rules/repository'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ ruleId: string }> }

export async function PUT(request: Request, { params }: Params) {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  const parsed = await parseJsonBody(request, promotionRuleInputSchema)
  if ('response' in parsed) return parsed.response

  try {
    const rule = await updateRule(session.userId, (await params).ruleId, parsed.data)
    if (!rule) return NextResponse.json({ error: 'החוק לא נמצא' }, { status: 404 })
    return NextResponse.json({ rule })
  } catch (err) {
    return serverError('update rule', err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  try {
    await deleteRule(session.userId, (await params).ruleId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('delete rule', err)
  }
}
