import type { ReactNode } from 'react'
import { Lock, RotateCw } from 'lucide-react'
import { PREVIEW_VIEWPORT_WIDTH } from '@/lib/landingBuilder/previewZoom'
import type { PreviewDevice } from '@/lib/landingBuilder/types'
import { ScaledViewport } from './ScaledViewport'

const FRAME_CLASSES: Record<PreviewDevice, string> = {
  desktop: 'w-full rounded-2xl',
  mobile: 'w-[390px] max-w-full rounded-[2rem] ring-[6px] ring-slate-900',
}

function AddressBar({ host }: { host: string }) {
  return (
    <div dir="ltr" className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-3.5 py-2.5">
      <span className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
      </span>
      <span className="mx-auto flex min-w-0 max-w-sm grow items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
        <Lock className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{host}</span>
      </span>
      <RotateCw className="size-3.5 text-slate-300" aria-hidden />
    </div>
  )
}

export function BrowserFrame({ device, host, children }: { device: PreviewDevice; host: string; children: ReactNode }) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden bg-white shadow-2xl shadow-slate-900/10 transition-[width] duration-300 ${FRAME_CLASSES[device]}`}
    >
      <AddressBar host={host} />
      <ScaledViewport virtualWidth={PREVIEW_VIEWPORT_WIDTH[device]}>{children}</ScaledViewport>
    </div>
  )
}
