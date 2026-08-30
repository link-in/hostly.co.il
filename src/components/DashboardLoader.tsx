'use client'

import type { CSSProperties } from 'react'
import { Home } from 'lucide-react'

type LoaderVariant = 'fullscreen' | 'section' | 'inline'
type LoaderTone = 'onGradient' | 'onDark' | 'onLight'

type DashboardLoaderProps = {
  variant?: LoaderVariant
  /** Visual tone for label/accents against the surrounding background. */
  tone?: LoaderTone
  label?: string
  /** Extra min-height for section loaders (e.g. calendar panel). */
  minHeight?: number | string
  className?: string
  style?: CSSProperties
}

const TONE_STYLES: Record<
  LoaderTone,
  { label: string; track: string; glow: string; icon: string }
> = {
  onGradient: {
    label: 'rgba(255, 255, 255, 0.92)',
    track: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(240, 147, 251, 0.55)',
    icon: '#ffffff',
  },
  onDark: {
    label: 'rgba(254, 243, 255, 0.9)',
    track: 'rgba(255, 255, 255, 0.14)',
    glow: 'rgba(249, 147, 251, 0.45)',
    icon: '#fce7f3',
  },
  onLight: {
    label: '#64748b',
    track: 'rgba(102, 126, 234, 0.18)',
    glow: 'rgba(118, 75, 162, 0.35)',
    icon: '#667eea',
  },
}

const SIZE: Record<LoaderVariant, number> = {
  fullscreen: 64,
  section: 52,
  inline: 20,
}

const ICON_SIZE: Record<LoaderVariant, number> = {
  fullscreen: 22,
  section: 18,
  inline: 10,
}

/**
 * Branded Hostly loader — soft gradient ring around a home icon.
 * Use fullscreen for auth/page boot, section for data panels, inline for refresh cues.
 */
export default function DashboardLoader({
  variant = 'section',
  tone = 'onLight',
  label = 'טוען נתונים…',
  minHeight,
  className,
  style,
}: DashboardLoaderProps) {
  const size = SIZE[variant]
  const iconSize = ICON_SIZE[variant]
  const colors = TONE_STYLES[tone]
  const showLabel = variant !== 'inline' && !!label

  const spinner = (
    <div
      className="hostly-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={
        {
          '--loader-size': `${size}px`,
          '--loader-track': colors.track,
          '--loader-glow': colors.glow,
          '--loader-label': colors.label,
          '--loader-icon': colors.icon,
        } as CSSProperties
      }
    >
      <div className="hostly-loader__ring" aria-hidden="true">
        <span className="hostly-loader__orbit" />
        <span className="hostly-loader__core">
          <Home size={iconSize} strokeWidth={1.75} />
        </span>
      </div>
      {showLabel ? <p className="hostly-loader__label">{label}</p> : null}
      <span className="visually-hidden">{label || 'טוען…'}</span>
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />
    </div>
  )

  if (variant === 'inline') {
    return (
      <span className={className} style={{ display: 'inline-flex', verticalAlign: 'middle', ...style }}>
        {spinner}
      </span>
    )
  }

  if (variant === 'fullscreen') {
    return (
      <main
        dir="rtl"
        className={className}
        style={{
          minHeight: '100vh',
          background: '#F8FAFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {spinner}
      </main>
    )
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: minHeight ?? 180,
        width: '100%',
        ...style,
      }}
    >
      {spinner}
    </div>
  )
}

const LOADER_CSS = `
  .hostly-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    user-select: none;
  }

  .hostly-loader__ring {
    position: relative;
    width: var(--loader-size);
    height: var(--loader-size);
  }

  .hostly-loader__orbit {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2.5px solid var(--loader-track);
    border-top-color: #f093fb;
    border-right-color: #a78bfa;
    box-shadow: 0 0 18px var(--loader-glow);
    animation: hostly-loader-spin 0.85s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  }

  .hostly-loader__core {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--loader-icon);
    filter: drop-shadow(0 0 10px var(--loader-glow));
    animation: hostly-loader-pulse 1.4s ease-in-out infinite;
  }

  .hostly-loader__label {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--loader-label);
    animation: hostly-loader-fade 1.6s ease-in-out infinite;
  }

  @keyframes hostly-loader-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes hostly-loader-pulse {
    0%, 100% { transform: scale(0.94); opacity: 0.8; }
    50% { transform: scale(1); opacity: 1; }
  }

  @keyframes hostly-loader-fade {
    0%, 100% { opacity: 0.65; }
    50% { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hostly-loader__orbit,
    .hostly-loader__core,
    .hostly-loader__label {
      animation: none;
    }
  }
`
