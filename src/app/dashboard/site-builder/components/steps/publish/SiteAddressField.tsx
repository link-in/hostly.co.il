'use client'

import { useId } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { SITE_ADDRESS_ERROR_MESSAGES, SITE_ROOT_DOMAIN, validateSiteAddress } from '@/lib/landingBuilder/siteAddress'
import { useBuilderDispatch, useBuilderState } from '../../../state/BuilderProvider'
import { useDraftPersistence } from '../../../state/DraftPersistence'
import { useSiteAddressCheck, type SiteAddressCheckState } from '../../../state/useSiteAddressCheck'

const EXAMPLE_ADDRESS = 'nof-harim-dafna'

function AddressStatus({ id, address, check }: { id: string; address: string; check: SiteAddressCheckState }) {
  const error = address ? validateSiteAddress(address) : null

  if (error) return <StatusLine id={id} tone="error" text={SITE_ADDRESS_ERROR_MESSAGES[error]} />
  if (!check) return null
  if (check.status === 'checking') return <StatusLine id={id} tone="pending" text="בודקים אם הכתובת פנויה…" />
  return <StatusLine id={id} tone={check.status === 'taken' || check.status === 'invalid' ? 'error' : 'ok'} text={check.message} />
}

const TONES = {
  ok: { className: 'text-emerald-700', Icon: CheckCircle2 },
  error: { className: 'text-red-600', Icon: XCircle },
  pending: { className: 'text-slate-500', Icon: Loader2 },
} as const

function StatusLine({ id, tone, text }: { id: string; tone: keyof typeof TONES; text: string }) {
  const { className, Icon } = TONES[tone]
  return (
    <p id={id} aria-live="polite" className={`mt-1.5 flex items-center gap-1.5 text-xs ${className}`}>
      <Icon className={`size-3.5 shrink-0 ${tone === 'pending' ? 'animate-spin' : ''}`} aria-hidden />
      {text}
    </p>
  )
}

export default function SiteAddressField() {
  const { draft } = useBuilderState()
  const dispatch = useBuilderDispatch()
  const { canSave } = useDraftPersistence()
  const check = useSiteAddressCheck(draft.siteAddress, canSave)
  const inputId = useId()
  const statusId = useId()

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        כתובת האתר
      </label>
      <div
        dir="ltr"
        className="flex items-center overflow-hidden rounded-xl border-[1px] border-slate-200 bg-white transition focus-within:border-(--hb) focus-within:ring-[3px] focus-within:ring-(--hb)/15"
      >
        <span className="pl-3.5 text-sm text-slate-400">https://</span>
        <input
          id={inputId}
          value={draft.siteAddress}
          onChange={(event) => dispatch({ type: 'site/addressChanged', address: event.target.value })}
          placeholder={EXAMPLE_ADDRESS}
          aria-describedby={statusId}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 grow bg-transparent px-1 py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        />
        <span className="bg-slate-50 px-3 py-2.5 text-sm text-slate-500">.{SITE_ROOT_DOMAIN}</span>
      </div>
      <AddressStatus id={statusId} address={draft.siteAddress} check={check} />
      <p className="mt-1.5 text-xs leading-5 text-slate-500">
        אותיות באנגלית, ספרות ומקף. לדוגמה:{' '}
        <span dir="ltr" className="inline-block whitespace-nowrap font-medium text-slate-600">
          {EXAMPLE_ADDRESS}.{SITE_ROOT_DOMAIN}
        </span>
      </p>
    </div>
  )
}
