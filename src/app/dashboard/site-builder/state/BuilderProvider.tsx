'use client'

import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react'
import {
  builderReducer,
  createInitialState,
  type BuilderAction,
  type BuilderState,
} from '@/lib/landingBuilder/draftReducer'
import type { DraftImage, LandingDraft } from '@/lib/landingBuilder/types'

const BuilderStateContext = createContext<BuilderState | null>(null)
const BuilderDispatchContext = createContext<Dispatch<BuilderAction> | null>(null)

function useRevokeUploadsOnUnmount(images: DraftImage[]) {
  const latestImages = useRef(images)

  useEffect(() => {
    latestImages.current = images
  }, [images])

  useEffect(
    () => () => {
      latestImages.current
        .filter((image) => image.source === 'upload')
        .forEach((image) => URL.revokeObjectURL(image.url))
    },
    [],
  )
}

export function BuilderProvider({
  initialDraft,
  children,
}: {
  initialDraft?: LandingDraft
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(builderReducer, initialDraft, createInitialState)
  useRevokeUploadsOnUnmount(state.draft.images)

  return (
    <BuilderStateContext.Provider value={state}>
      <BuilderDispatchContext.Provider value={dispatch}>{children}</BuilderDispatchContext.Provider>
    </BuilderStateContext.Provider>
  )
}

export function useBuilderState(): BuilderState {
  const state = useContext(BuilderStateContext)
  if (!state) throw new Error('useBuilderState must be used inside <BuilderProvider>')
  return state
}

export function useBuilderDispatch(): Dispatch<BuilderAction> {
  const dispatch = useContext(BuilderDispatchContext)
  if (!dispatch) throw new Error('useBuilderDispatch must be used inside <BuilderProvider>')
  return dispatch
}
