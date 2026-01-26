'use client'

import { useState, useEffect } from 'react'

interface HeroProps {
  content: {
    title?: string
    subtitle?: string
    images?: string[]
  }
  images: Array<{ public_url: string }>
}

const Hero = ({ content, images }: HeroProps) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  
  // שימוש בתמונות מה-Storage או fallback לתמונות ברירת מחדל
  const backgroundImages = images.length > 0 
    ? images.map(img => img.public_url)
    : [
        '/photos/IMG_2254.JPG',
        '/photos/IMG_2277.JPG',
        '/photos/IMG_2269.JPG',
        '/photos/IMG_2287.JPG',
      ]

  // החלפה אוטומטית כל 5 שניות
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % backgroundImages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [backgroundImages.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + backgroundImages.length) % backgroundImages.length)
  }

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % backgroundImages.length)
  }

  return (
    <>
      <section className="bg-image-slider bg-light" id="home" style={{ position: 'relative', borderBottom: '10px solid #2e2e2e', paddingTop: '80px' }}>
        {/* תמונות רקע */}
        <div className="slider-backgrounds">
          {backgroundImages.map((image, index) => (
            <div
              key={index}
              className={`slider-background ${index === currentSlide ? 'active' : ''}`}
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: index === currentSlide ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                zIndex: 1,
              }}
            />
          ))}
        </div>
        
        <div className="" style={{ zIndex: 2 }} />
        
        {/* כפתורי ניווט */}
        <button
          className="slider-nav-btn slider-nav-prev"
          onClick={goToPrevious}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 3,
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            fontSize: '24px',
            color: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
        >
          ‹
        </button>
        
        <button
          className="slider-nav-btn slider-nav-next"
          onClick={goToNext}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 3,
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            fontSize: '24px',
            color: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
        >
          ›
        </button>
        
        {/* נקודות ניווט */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3,
          display: 'flex',
          gap: '10px',
        }}>
          {backgroundImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: '2px solid white',
                background: index === currentSlide ? 'white' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>

        {/* תוכן Hero */}
        <div style={{
          position: 'relative',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
          {/* אפשר להוסיף כאן תוכן נוסף בעתיד */}
        </div>
      </section>
    </>
  )
}

export default Hero
