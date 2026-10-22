'use client'

import { useState, useTransition } from 'react'
import { CalendarX2, Check, CircleAlert, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui'
import type { ExecutionOutcome } from '@/lib/ai-assistant/actions/executeAction'
import type { ProposalSuccess } from '@/lib/ai-assistant/tools/proposeAction'
import { formatNightCount, formatNightSpan, formatPrice } from '@/lib/ai-assistant/ui/format'
import { confirmAssistantAction, rejectAssistantAction } from '../actions'

type CardOutcome = ExecutionOutcome | { ok: false; code: 'network'; message: string }

/** The request may have reached the server before failing, so the change might already be applied. */
const NETWORK_FAILURE: CardOutcome = {
  ok: false,
  code: 'network',
  message: 'לא התקבלה תשובה מהשרת. בדקו בלוח השנה אם השינוי בוצע לפני שמבקשים שוב.',
}

function ActionDetails({ proposal }: { proposal: ProposalSuccess }) {
  const { action } = proposal
  const { payload } = action
  const nights = `${formatNightSpan(payload.from, payload.to)} · ${formatNightCount(payload.nights)}`

  if (action.actionType === 'block_dates') {
    return (
      <>
        <div className="d-flex align-items-center gap-2 fw-semibold" style={{ color: 'var(--htxt-1)' }}>
          <CalendarX2 size={16} /> חסימת תאריכים · {payload.roomName}
        </div>
        <div className="small" style={{ color: 'var(--htxt-2)' }}>לילות: {nights}</div>
        <div className="small" style={{ color: 'var(--htxt-3)' }}>סיבה: {action.payload.reason}</div>
      </>
    )
  }

  return (
    <>
      <div className="d-flex align-items-center gap-2 fw-semibold" style={{ color: 'var(--htxt-1)' }}>
        <Tag size={16} /> עדכון מחיר · {payload.roomName}
      </div>
      <div className="small" style={{ color: 'var(--htxt-2)' }}>לילות: {nights}</div>
      <div className="small" style={{ color: 'var(--htxt-2)' }}>מחיר בסיס חדש: {formatPrice(action.payload.newPrice)}</div>
      <ul className="small list-unstyled mb-0" style={{ color: 'var(--htxt-3)' }}>
        {action.payload.channelPrices.map((channel) => (
          <li key={channel.channelKey}>
            {channel.name}: {formatPrice(channel.price)}
          </li>
        ))}
      </ul>
    </>
  )
}

/** Shows a prepared change and runs it only on an explicit click. Each card resolves once. */
export default function ConfirmActionCard({ proposal }: { proposal: ProposalSuccess }) {
  const [outcome, setOutcome] = useState<CardOutcome | null>(null)
  const [pending, setPending] = useState<'confirm' | 'reject' | null>(null)
  const [, startTransition] = useTransition()

  const resolve = (kind: 'confirm' | 'reject') => {
    setPending(kind)
    startTransition(async () => {
      const resolver = kind === 'confirm' ? confirmAssistantAction : rejectAssistantAction
      try {
        setOutcome(await resolver(proposal.actionId))
      } catch {
        setOutcome(NETWORK_FAILURE)
      } finally {
        setPending(null)
      }
    })
  }

  return (
    <div
      className="card border-0 shadow-sm w-100"
      style={{ maxWidth: 520, background: 'var(--hsurf)', borderInlineStart: '3px solid var(--hb)' }}
      data-testid="ai-assistant-confirm-card"
    >
      <div className="card-body p-3 d-flex flex-column gap-1">
        <ActionDetails proposal={proposal} />

        {outcome ? (
          <div
            className="small d-flex align-items-center gap-2 mt-2 fw-semibold"
            style={{ color: outcome.ok && outcome.status === 'executed' ? 'var(--bs-success)' : outcome.ok ? 'var(--htxt-2)' : 'var(--bs-danger)' }}
            role="status"
            data-testid="ai-assistant-confirm-outcome"
          >
            {outcome.ok ? <Check size={16} /> : <CircleAlert size={16} />}
            {outcome.message}
          </div>
        ) : (
          <div className="d-flex gap-2 mt-2">
            <Button
              variant="primary"
              size="sm"
              loading={pending === 'confirm'}
              disabled={pending !== null}
              onClick={() => resolve('confirm')}
              iconStart={<Check size={16} />}
              data-testid="ai-assistant-confirm"
            >
              אשר
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={pending === 'reject'}
              disabled={pending !== null}
              onClick={() => resolve('reject')}
              iconStart={<X size={16} />}
              data-testid="ai-assistant-reject"
            >
              בטל
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
