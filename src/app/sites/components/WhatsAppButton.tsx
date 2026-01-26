'use client'

import { Icon } from '@iconify/react'
import { useEffect } from 'react'

const WhatsAppButton = () => {
  // המספר הישראלי: 052-8676516
  // פורמט בינלאומי ל-WhatsApp: 972 + 52 (בלי ה-0) + 8676516
  const phoneNumber = '972528676516'
  const whatsappUrl = `https://wa.me/${phoneNumber}`

  // הוספת CSS למובייל
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media (max-width: 768px) {
        .whatsapp-floating-button {
          bottom: 80px !important;
          left: 20px !important;
          width: 56px !important;
          height: 56px !important;
        }
        .whatsapp-floating-button svg {
          font-size: 28px !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => { if (document.head.contains(style)) document.head.removeChild(style) }
  }, [])

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating-button"
      style={{
        position: 'fixed',
        bottom: '100px', // מעל כפתור ההזמנות (30px + 60px + 10px רווח)
        left: '30px', // אותו מיקום אופקי כמו כפתור ההזמנות
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: '#25D366', // צבע WhatsApp הרשמי
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)',
        zIndex: 10000,
        textDecoration: 'none',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)'
        e.currentTarget.style.boxShadow = '0 6px 25px rgba(37, 211, 102, 0.6)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(37, 211, 102, 0.4)'
      }}
      aria-label="שלח הודעה ב-WhatsApp"
    >
      <Icon icon="mdi:whatsapp" style={{ fontSize: '32px' }} />
    </a>
  )
}

export default WhatsAppButton


