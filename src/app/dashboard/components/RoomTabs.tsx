'use client'

import React from 'react'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'

export default function RoomTabs() {
  const { rooms, selectedRoomId, setSelectedRoom, isLoading } = useSelectedRoom()

  // Don't render if only one room (nothing to switch)
  if (isLoading || rooms.length <= 1) {
    return null
  }

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '12px',
        marginBottom: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          color: 'rgba(249,147,251,0.8)',
          fontSize: '0.8rem',
          fontWeight: 600,
          marginLeft: '0.25rem',
          whiteSpace: 'nowrap',
        }}
      >
        יחידה:
      </span>
      {rooms.map((room) => {
        const isActive = room.id === selectedRoomId
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => setSelectedRoom(room.id)}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: '8px',
              border: isActive
                ? '2px solid rgba(249,147,251,0.8)'
                : '2px solid rgba(255,255,255,0.15)',
              background: isActive
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255,255,255,0.05)',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
              boxShadow: isActive
                ? '0 2px 10px rgba(102,126,234,0.45)'
                : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
              }
            }}
          >
            {room.name}
          </button>
        )
      })}
    </div>
  )
}
