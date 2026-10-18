'use client'

import { useEffect, useRef, useState } from 'react'
import { pickActiveSectionId } from '@/lib/profile/sections'

/** מסמן בניווט את המקטע שנמצא כרגע בראש המסך (scroll-spy). */
export function useActiveSection(sectionIds: readonly string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '')
  const visibleRef = useRef<Set<string>>(new Set())
  const idsKey = sectionIds.join('|')

  useEffect(() => {
    const ids = idsKey.split('|').filter(Boolean)
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleRef.current.add(entry.target.id)
          else visibleRef.current.delete(entry.target.id)
        }
        setActiveId((previous) => pickActiveSectionId(ids, visibleRef.current, previous))
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [idsKey])

  return { activeId, setActiveId }
}
