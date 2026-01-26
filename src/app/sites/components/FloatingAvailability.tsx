'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Icon } from '@iconify/react'

const FloatingAvailabilityContent = () => {
  const [isOpen, setIsOpen] = useState(false)
  const searchParams = useSearchParams()

  // הגדרות עיצוב מודרניות
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideInUp {
        from { 
          opacity: 0; 
          transform: translateY(30px) scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0) scale(1); 
        }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .floating-availability-button {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .floating-availability-button:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5), 0 0 0 6px rgba(102, 126, 234, 0.15);
      }
      @media (max-width: 768px) {
        .floating-availability-button { 
          bottom: 20px !important; 
          left: 20px !important; 
          width: 56px !important; 
          height: 56px !important;
          font-size: 24px !important;
        }
        .floating-availability-button svg {
          font-size: 24px !important;
        }
        .floating-availability-window { 
          bottom: 80px !important; 
          left: 10px !important; 
          right: 10px !important; 
          width: auto !important; 
          max-width: calc(100vw - 20px) !important;
          height: calc(100vh - 100px) !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => { if (document.head.contains(style)) document.head.removeChild(style) }
  }, [])

  // פתיחה אוטומטית אם יש תאריכים ב-URL
  useEffect(() => {
    if (searchParams.get('checkin')) {
      setIsOpen(true)
    }
  }, [searchParams])

  // בניית ה-URL עבור ה-Iframe
  const getBeds24Url = () => {
    const propid = "306559"
    const checkin = searchParams.get('checkin') || ''
    const checkout = searchParams.get('checkout') || ''
    const numadult = searchParams.get('numadult') || searchParams.get('guests') || '2'
    
    // בניית הכתובת עם הפרמטרים
    let url = `https://beds24.com/booking2.php?propid=${propid}&layout=1&lang=he`
    
    if (checkin && checkout) {
      url += `&checkin=${checkin}&checkout=${checkout}&numadult=${numadult}`
    }
    
    return url
  }

  return (
    <>
      {/* כפתור צף מודרני */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="floating-availability-button"
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '30px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4), 0 0 0 4px rgba(102, 126, 234, 0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
        }}
        aria-label={isOpen ? 'סגור חלון הזמנות' : 'פתח חלון הזמנות'}
      >
        {isOpen ? (
          <Icon icon="mdi:close" style={{ fontSize: '28px' }} />
        ) : (
          <Icon icon="mdi:calendar-check" style={{ fontSize: '28px' }} />
        )}
      </button>

      {/* חלון ה-Iframe מודרני */}
      {isOpen && (
        <>
          {/* רקע מעומעם עם אנימציה */}
          <div 
            onClick={() => setIsOpen(false)} 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 1039,
              animation: 'fadeIn 0.3s ease-out'
            }} 
          />
          
          {/* חלון מודרני */}
          <div 
            className="floating-availability-window" 
            style={{
              position: 'fixed',
              bottom: '100px',
              left: '30px',
              width: '520px',
              maxWidth: 'calc(100vw - 40px)',
              height: '82vh',
              maxHeight: '800px',
              background: 'white',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              zIndex: 1040,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* כותרת מודרנית עם גרדיאנט */}
            <div 
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                color: 'white',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
                <Icon icon="mdi:calendar-clock" style={{ fontSize: '24px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', letterSpacing: '0.3px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  הזמנה ישירה
                </h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  zIndex: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'
                  e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.transform = 'rotate(0deg) scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                aria-label="סגור"
              >
                <Icon icon="mdi:close" style={{ fontSize: '20px' }} />
              </button>
            </div>
            
            {/* תוכן Iframe */}
            <div style={{ 
              flex: 1, 
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <iframe 
                src={getBeds24Url()}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none',
                }}
                title="Beds24 Booking"
                allow="payment"
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}

const FloatingAvailability = () => {
  return (
    <Suspense fallback={null}>
      <FloatingAvailabilityContent />
    </Suspense>
  )
}

export default FloatingAvailability
