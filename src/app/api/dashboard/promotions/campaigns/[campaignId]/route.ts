import { parseJsonBody } from '@/lib/onboarding/http'
import { actionResponse, demoForbidden, getHostSession, serverError, unauthorized } from '@/lib/promotions/api/http'
import { campaignActionSchema, campaignEditSchema } from '@/lib/promotions/domain/types'
import {
  approveCampaign,
  editCampaign,
  rejectCampaign,
  stopCampaign,
} from '@/lib/promotions/pipeline/campaignActions'
import { createDefaultDeps } from '@/lib/promotions/pipeline/defaultDeps'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Params = { params: Promise<{ campaignId: string }> }

/** Edit copy / budget of a draft before approval. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  const parsed = await parseJsonBody(request, campaignEditSchema)
  if ('response' in parsed) return parsed.response

  try {
    return actionResponse(await editCampaign(createDefaultDeps(), session.userId, (await params).campaignId, parsed.data))
  } catch (err) {
    return serverError('edit campaign', err)
  }
}

/** { action: 'approve' | 'reject' | 'stop' } */
export async function POST(request: Request, { params }: Params) {
  const session = await getHostSession()
  if (!session) return unauthorized()
  if (session.isDemo) return demoForbidden()

  const parsed = await parseJsonBody(request, campaignActionSchema)
  if ('response' in parsed) return parsed.response

  const deps = createDefaultDeps()
  const campaignId = (await params).campaignId
  try {
    switch (parsed.data.action) {
      case 'approve':
        return actionResponse(await approveCampaign(deps, session.userId, campaignId))
      case 'reject':
        return actionResponse(await rejectCampaign(deps, session.userId, campaignId))
      case 'stop':
        return actionResponse(await stopCampaign(deps, session.userId, campaignId))
    }
  } catch (err) {
    return serverError(`campaign ${parsed.data.action}`, err)
  }
}
