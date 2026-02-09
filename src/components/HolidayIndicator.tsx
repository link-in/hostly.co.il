'use client'

import React, { useState } from 'react'
import type { Holiday } from '@/lib/holidays/types'

type HolidayIndicatorProps = {
  holiday: Holiday
  isMobile?: boolean
}

export default function HolidayIndicator({ holiday, isMobile = false }: HolidayIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isMobile) {
      setShowTooltip((prev) => !prev)
    }
  }

  const handleMouseEnter = () => {
    if (!isMobile) {
      setShowTooltip(true)
    }
  }

  const handleMouseLeave = () => {
    if (!isMobile) {
      setShowTooltip(false)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '2px',
        right: '2px',
        zIndex: 10,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <span
        style={{
          display: 'inline-block',
          fontSize: '14px',
          cursor: 'pointer',
          animation: 'wave 2s ease-in-out infinite',
          filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.3))',
        }}
        aria-label={`חג: ${holiday.hebrew}`}
        role="img"
      >
        🚩
      </span>
      
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '18px',
            right: '0',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 215, 0, 0.5)',
          }}
        >
          {holiday.hebrew}
        </div>
      )}

      <style jsx>{`
        @keyframes wave {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.05) rotate(-5deg);
          }
          75% {
            transform: scale(1.05) rotate(5deg);
          }
        }
      `}</style>
    </div>
  )
}
