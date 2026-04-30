'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface RoomInfo {
  id: string
  name: string
}

interface RoomContextValue {
  rooms: RoomInfo[]
  selectedRoomId: string
  selectedRoom: RoomInfo | null
  setSelectedRoom: (roomId: string) => void
  isLoading: boolean
}

const RoomContext = createContext<RoomContextValue | null>(null)

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlRoomId = searchParams.get('room') ?? ''
  // Extract only the first room ID — session roomId may be a comma-separated list (e.g. "638851,672381")
  const sessionRoomId = (session?.user?.roomId ?? '').split(',')[0].split(':')[0].trim()

  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    urlRoomId || sessionRoomId
  )
  const [isLoading, setIsLoading] = useState(true)

  // Sync selectedRoomId when session loads and no URL param is set
  useEffect(() => {
    if (!urlRoomId && sessionRoomId && !selectedRoomId) {
      // sessionRoomId is already the first ID from the comma-separated list
      setSelectedRoomId(sessionRoomId)
    }
  }, [urlRoomId, sessionRoomId, selectedRoomId])

  // Fetch room list once authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/dashboard/room-list')
        if (!res.ok) return
        const data: RoomInfo[] = await res.json()

        if (cancelled) return
        setRooms(data)

        // Set initial selection: prefer URL param, then session room, then first room
        if (!urlRoomId) {
          const defaultId = sessionRoomId || data[0]?.id || ''
          setSelectedRoomId(defaultId)
        } else {
          // Validate the URL-supplied room exists in the list
          const exists = data.some((r) => r.id === urlRoomId)
          if (!exists && data.length > 0) {
            setSelectedRoomId(data[0].id)
          }
        }
      } catch {
        // Silently fall back – other parts of the app use session roomId as fallback
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchRooms()
    return () => {
      cancelled = true
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const setSelectedRoom = useCallback(
    (roomId: string) => {
      setSelectedRoomId(roomId)
      const params = new URLSearchParams(searchParams.toString())
      params.set('room', roomId)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null

  return (
    <RoomContext.Provider
      value={{ rooms, selectedRoomId, selectedRoom, setSelectedRoom, isLoading }}
    >
      {children}
    </RoomContext.Provider>
  )
}

export function useSelectedRoom(): RoomContextValue {
  const ctx = useContext(RoomContext)
  if (!ctx) {
    throw new Error('useSelectedRoom must be used inside RoomProvider')
  }
  return ctx
}
