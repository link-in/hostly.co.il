'use client'

import React, { ReactNode } from 'react'

interface GlightBoxProps {
  href: string
  title?: string
  className?: string
  'data-gallery'?: string
  children: ReactNode
}

const GlightBox = ({ href, title, className, 'data-gallery': dataGallery, children }: GlightBoxProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // For now, just open in new tab
    // You can add a proper lightbox library later if needed
    window.open(href, '_blank')
  }

  return (
    <a
      href={href}
      className={className}
      data-gallery={dataGallery}
      title={title}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </a>
  )
}

export default GlightBox
