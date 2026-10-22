'use client'

import { useMemo, type ReactNode } from 'react'
import { AvailabilitySourceProvider } from '@/components/landing-templates/booking/availabilitySource'
import { getPreviewAvailabilityAction } from '../draftActions'
import { useBuilderState } from './BuilderProvider'

/** Real Beds24 nights for the imported room; before import (or for demo users) the widget stays open. */
export default function PreviewAvailability({ canLoad, children }: { canLoad: boolean; children: ReactNode }) {
  const { roomId } = useBuilderState().draft
  const source = useMemo(
    () => (canLoad && roomId ? { key: `room:${roomId}`, load: () => getPreviewAvailabilityAction(roomId) } : null),
    [canLoad, roomId],
  )
  return <AvailabilitySourceProvider source={source}>{children}</AvailabilitySourceProvider>
}
