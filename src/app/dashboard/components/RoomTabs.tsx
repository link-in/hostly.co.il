'use client'

import React from 'react'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'

/**
 * בורר יחידות — סגנון segmented control בהיר, תואם למערכת העיצוב.
 * מוצג רק כשיש יותר מיחידה אחת.
 */
export default function RoomTabs() {
  const { rooms, selectedRoomId, setSelectedRoom, isLoading } = useSelectedRoom()

  if (isLoading || rooms.length <= 1) {
    return null
  }

  return (
    <div
      dir="rtl"
      role="tablist"
      aria-label="בחירת יחידה"
      className="d-flex align-items-center flex-wrap gap-2 mb-3"
    >
      <span style={{ color: 'var(--htxt-3)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
        יחידה:
      </span>
      {rooms.map((room) => {
        const isActive = room.id === selectedRoomId
        return (
          <button
            key={room.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setSelectedRoom(room.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 14px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: '1px solid',
              borderColor: isActive ? 'rgba(113,51,217,0.4)' : 'var(--hborder)',
              background: isActive ? 'rgba(113,51,217,0.1)' : 'var(--hsurf)',
              color: isActive ? 'var(--hb)' : 'var(--htxt-2)',
              transition: 'all 0.15s',
            }}
          >
            {room.name}
          </button>
        )
      })}
    </div>
  )
}
