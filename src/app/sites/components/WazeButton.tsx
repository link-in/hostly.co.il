'use client'

import { Icon } from '@iconify/react'
import { useEffect } from 'react'

const WazeButton = () => {
  // כתובת: קיבוץ דפנה
  // Waze URL לניווט - משתמש בשם המקום
  const wazeUrl = 'https://waze.com/ul?q=קיבוץ%20דפנה&navigate=yes'

  // הוספת CSS למובייל
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media (max-width: 768px) {
        .waze-floating-button {
          bottom: 150px !important;
          left: 20px !important;
          width: 56px !important;
          height: 56px !important;
        }
        .waze-floating-button svg {
          font-size: 28px !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => { if (document.head.contains(style)) document.head.removeChild(style) }
  }, [])

  return (
    <a
      href={wazeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="waze-floating-button"
      style={{
        position: 'fixed',
        bottom: '170px', // מעל כפתור ה-WhatsApp (100px + 60px + 10px רווח)
        left: '30px', // אותו מיקום אופקי כמו כפתור ה-WhatsApp
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: '#33CCFF', // צבע Waze הרשמי
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(51, 204, 255, 0.4)',
        zIndex: 10000,
        textDecoration: 'none',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)'
        e.currentTarget.style.boxShadow = '0 6px 25px rgba(51, 204, 255, 0.6)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(51, 204, 255, 0.4)'
      }}
      aria-label="פתח ניווט ב-Waze לקיבוץ דפנה"
    >
      <Icon icon="mdi:waze" style={{ fontSize: '32px' }} />
    </a>
  )
}

export default WazeButton

