'use client'

import { Expand, Monitor, Smartphone, type LucideIcon } from 'lucide-react'
import type { PreviewDevice } from '@/lib/landingBuilder/types'

const DEVICES: readonly { id: PreviewDevice; label: string; icon: LucideIcon }[] = [
  { id: 'desktop', label: 'מחשב', icon: Monitor },
  { id: 'mobile', label: 'נייד', icon: Smartphone },
]

interface DeviceToggleProps {
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
}

export function DeviceToggle({ device, onDeviceChange }: DeviceToggleProps) {
  return (
    <div role="radiogroup" aria-label="גודל מסך" className="flex rounded-xl bg-white p-1 ring-1 ring-slate-200">
      {DEVICES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={device === id}
          aria-label={label}
          title={label}
          onClick={() => onDeviceChange(id)}
          className={`grid size-8 cursor-pointer place-items-center rounded-lg transition ${
            device === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  )
}

interface PreviewToolbarProps extends DeviceToggleProps {
  templateName: string
  onOpenFullScreen: () => void
}

export function PreviewToolbar({ templateName, device, onDeviceChange, onOpenFullScreen }: PreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        תצוגה חיה
        <span className="font-normal text-slate-400">· {templateName}</span>
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFullScreen}
          className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <Expand className="size-4" aria-hidden />
          תצוגה מקדימה
        </button>
        <DeviceToggle device={device} onDeviceChange={onDeviceChange} />
      </div>
    </div>
  )
}
