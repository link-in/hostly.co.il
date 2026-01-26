'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'

interface LandingPageClientProps {
  landingPage: {
    id: string
    subdomain: string
    site_title: string
    site_subtitle: string
    meta_settings: {
      whatsapp_number?: string
      waze_link?: string
      phone?: string
      email?: string
      address?: string
    }
    sections?: Array<{
      id: string
      section_type: string
      content: any
      is_visible: boolean
      order_index: number
    }>
    images?: Array<{
      id: string
      section_type: string
      public_url: string
      order_index: number
    }>
  }
}

export default function LandingPageClient({ landingPage }: LandingPageClientProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  
  // מיון sections לפי order_index
  const sections = [...(landingPage.sections || [])].sort((a, b) => a.order_index - b.order_index)
  
  // קבלת sections ספציפיים
  const heroSection = sections.find(s => s.section_type === 'hero')
  const featuresSection = sections.find(s => s.section_type === 'features')
  const portfolioSection = sections.find(s => s.section_type === 'portfolio')
  
  // תמונות Hero
  const heroImages = (landingPage.images || [])
    .filter(img => img.section_type === 'hero')
    .sort((a, b) => a.order_index - b.order_index)
  
  // תמונות Portfolio
  const portfolioImages = (landingPage.images || [])
    .filter(img => img.section_type === 'portfolio')
    .sort((a, b) => a.order_index - b.order_index)
  
  // Auto slide for hero
  useEffect(() => {
    if (heroImages.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [heroImages.length])
  
  const { whatsapp_number, waze_link } = landingPage.meta_settings || {}
  
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} dir="rtl">
      {/* Hero Section with Slider */}
      {heroImages.length > 0 && (
        <section style={{ 
          height: '100vh', 
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Image Slider */}
          {heroImages.map((img, idx) => (
            <div
              key={img.id}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: currentSlide === idx ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                zIndex: currentSlide === idx ? 1 : 0,
              }}
            >
              <Image
                src={img.public_url}
                alt={`Hero ${idx + 1}`}
                fill
                priority={idx === 0}
                style={{ objectFit: 'cover' }}
              />
            </div>
          ))}
          
          {/* Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))',
            zIndex: 2,
          }} />
          
          {/* Content */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            zIndex: 3,
            width: '90%',
            maxWidth: '800px',
          }}>
            <h1 style={{ 
              fontSize: 'clamp(32px, 6vw, 64px)', 
              fontWeight: 'bold', 
              textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
              marginBottom: '20px',
            }}>
              {heroSection?.content?.title || landingPage.site_title || 'ברוכים הבאים'}
            </h1>
            {(heroSection?.content?.subtitle || landingPage.site_subtitle) && (
              <h2 style={{ 
                fontSize: 'clamp(18px, 3vw, 32px)', 
                textShadow: '1px 1px 4px rgba(0,0,0,0.7)',
                fontWeight: 'normal',
              }}>
                {heroSection?.content?.subtitle || landingPage.site_subtitle}
              </h2>
            )}
          </div>
          
          {/* Slide Indicators */}
          {heroImages.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '10px',
              zIndex: 3,
            }}>
              {heroImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    background: currentSlide === idx ? 'white' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}
      
      {/* Features Section */}
      {featuresSection && featuresSection.is_visible && (
        <section style={{ 
          padding: '80px 20px', 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: 'clamp(28px, 4vw, 42px)', 
              textAlign: 'center', 
              marginBottom: '20px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {featuresSection.content?.title || 'התכונות שלנו'}
            </h2>
            {featuresSection.content?.description && (
              <p style={{ 
                fontSize: 'clamp(16px, 2vw, 20px)', 
                textAlign: 'center', 
                marginBottom: '60px',
                color: '#555',
                maxWidth: '800px',
                margin: '0 auto 60px',
              }}>
                {featuresSection.content.description}
              </p>
            )}
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '30px' 
            }}>
              {(featuresSection.content?.items || []).map((item: any, idx: number) => (
                <div 
                  key={idx}
                  style={{ 
                    background: 'white', 
                    padding: '30px', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    transition: 'transform 0.3s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                    {item.icon || '✨'}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#333' }}>
                    {item.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Portfolio/Gallery Section */}
      {portfolioImages.length > 0 && (
        <section style={{ padding: '80px 20px', background: 'white' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: 'clamp(28px, 4vw, 42px)', 
              textAlign: 'center', 
              marginBottom: '60px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              גלריית תמונות
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '20px' 
            }}>
              {portfolioImages.map((img) => (
                <div 
                  key={img.id}
                  style={{ 
                    position: 'relative', 
                    height: '300px', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.3s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Image 
                    src={img.public_url} 
                    alt="תמונה"
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Footer with Contact Info */}
      <footer style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        padding: '60px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '32px', marginBottom: '30px' }}>צור קשר</h3>
          <div style={{ fontSize: '18px', lineHeight: '2' }}>
            {landingPage.meta_settings?.phone && (
              <p>📞 {landingPage.meta_settings.phone}</p>
            )}
            {landingPage.meta_settings?.email && (
              <p>✉️ {landingPage.meta_settings.email}</p>
            )}
            {landingPage.meta_settings?.address && (
              <p>📍 {landingPage.meta_settings.address}</p>
            )}
          </div>
        </div>
      </footer>
      
      {/* Floating WhatsApp Button */}
      {whatsapp_number && (
        <a
          href={`https://wa.me/${whatsapp_number}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            background: '#25D366',
            borderRadius: '50%',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)',
            zIndex: 1000,
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
      )}
      
      {/* Floating Waze Button */}
      {waze_link && (
        <a
          href={waze_link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '60px',
            height: '60px',
            background: '#33CCFF',
            borderRadius: '50%',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(51, 204, 255, 0.4)',
            zIndex: 1000,
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
          aria-label="פתח ניווט ב-Waze"
        >
          <Icon icon="mdi:waze" style={{ fontSize: '32px' }} />
        </a>
      )}
    </div>
  )
}
