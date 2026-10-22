'use client'

import { useEffect, useRef, type TouchEvent } from 'react'
import { actionForKey, actionForSwipe, type LightboxAction } from '@/lib/landingBuilder/gallery/lightboxNavigation'

export function useLightboxKeyboard(onAction: (action: LightboxAction) => void) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const action = actionForKey(event.key)
      if (!action) return
      event.preventDefault()
      onAction(action)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onAction])
}

export function useBodyScrollLock() {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [])
}

export function useSwipe(onAction: (action: LightboxAction) => void) {
  const startX = useRef<number | null>(null)
  return {
    onTouchStart: (event: TouchEvent) => {
      startX.current = event.touches[0]?.clientX ?? null
    },
    onTouchEnd: (event: TouchEvent) => {
      const endX = event.changedTouches[0]?.clientX
      if (startX.current === null || endX === undefined) return
      const action = actionForSwipe(endX - startX.current)
      startX.current = null
      if (action) onAction(action)
    },
  }
}

/** Warms the browser cache so stepping through the gallery shows the next image instantly. */
export function usePreloadImages(urls: string[]) {
  useEffect(() => {
    urls.forEach((url) => {
      const image = new Image()
      image.src = url
    })
  }, [urls])
}
