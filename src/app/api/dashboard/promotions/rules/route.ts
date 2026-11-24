import { NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/onboarding/http'
import { demoForbidden, getHostSession, serverError, unauthorized } from '@/lib/promotions/api/http'
import { promotionRuleInputSchema } from '@/lib/promotions/domain/types'
import { createRule, listRules } from '@/lib/promotions/rules/repository'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return NextResponse.json({ rules: [] })

  try {
    return NextResponse.json({ rules: await listRules(session.userId) })
  } catch (err) {
    return serverError('list rules', err)
  }
}

export async function POST(request: Request) {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  const parsed = await parseJsonBody(request, promotionRuleInputSchema)
  if ('response' in parsed) return parsed.response

  try {
    return NextResponse.json({ rule: await createRule(session.userId, parsed.data) }, { status: 201 })
  } catch (err) {
    return serverError('create rule', err)
  }
}
