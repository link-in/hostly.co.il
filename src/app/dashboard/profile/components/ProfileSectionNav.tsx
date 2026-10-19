'use client'

import type { MouseEvent } from 'react'
import type { ProfileSectionMeta } from '@/lib/profile/sections'
import { SECTION_ICONS } from './sectionIcons'

interface ProfileSectionNavProps {
  sections: readonly ProfileSectionMeta[]
  activeId: string
  onSelect: (id: string) => void
}

/** ניווט בין מקטעים: עמודה דביקה בדסקטופ, פסי "צ'יפים" גוללים במובייל. */
export function ProfileSectionNav({ sections, activeId, onSelect }: ProfileSectionNavProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    onSelect(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="profile-nav" aria-label="מקטעי האזור האישי">
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section.id]
        const active = section.id === activeId
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`profile-nav-item${active ? ' profile-nav-item--active' : ''}`}
            aria-current={active ? 'true' : undefined}
            onClick={(event) => handleClick(event, section.id)}
          >
            <Icon size={17} />
            <span>{section.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
