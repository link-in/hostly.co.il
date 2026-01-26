'use client'

import Header from '@/components/layout/topnav/Header'
import Footer from '@/components/layout/footer/Footer'
import Hero from '@/app/sites/components/Hero'
import Features from '@/app/sites/components/Features'
import Portfolio from '@/app/sites/components/Portfolio'
import Contact from '@/app/sites/components/Contact'
import WhatsAppButton from '@/app/sites/components/WhatsAppButton'
import WazeButton from '@/app/sites/components/WazeButton'
import FloatingAvailability from '@/app/sites/components/FloatingAvailability'

interface Section {
  id: string
  section_type: string
  content: any
  is_visible: boolean
  order_index: number
}

interface LandingImage {
  id: string
  section_type: string
  public_url: string
  order_index: number
}

interface LandingPageClientProps {
  landingPage: {
    site_title: string
    site_subtitle: string
    meta_settings: any
  }
  sections: Section[]
  images: LandingImage[]
}

export default function LandingPageClient({ 
  landingPage, 
  sections, 
  images 
}: LandingPageClientProps) {
  
  // ארגון תמונות לפי section
  const imagesBySection = images.reduce((acc, img) => {
    if (!acc[img.section_type]) acc[img.section_type] = []
    acc[img.section_type].push(img)
    return acc
  }, {} as Record<string, LandingImage[]>)
  
  // מציאת section לפי type
  const getSection = (type: string) => sections.find(s => s.section_type === type)
  
  return (
    <>
      <div className="header-mobile-only">
        <Header />
      </div>
      
      {/* כותרת אתר */}
      <div 
        className="main-tilte text-center" 
        style={{
          position: 'absolute',
          top: '20px',
          left: 0,
          width: '100%',
          zIndex: 1000,
          padding: '8px 0',
        }}>
        <h1 style={{ 
          fontSize: '38px', 
          fontWeight: 'bold', 
          color: '#0d9488',
          margin: '0', 
          textShadow: '0px 0px 1px #ffffff', 
          fontFamily: 'Rubik, sans-serif' 
        }}> 
          {landingPage.site_title}
        </h1>
        {landingPage.site_subtitle && (
          <h2 style={{
            margin: '0',
            fontSize: '12px',
            textShadow: '0px 0px 3px #000', 
            fontFamily: 'Rubik, sans-serif'
          }}>
            {landingPage.site_subtitle}
          </h2>
        )}
      </div>
      
      {/* Sections דינמיים */}
      {getSection('hero') && (
        <Hero 
          content={getSection('hero')!.content} 
          images={imagesBySection['hero'] || []} 
        />
      )}
      
      {getSection('features') && (
        <Features content={getSection('features')!.content} />
      )}
      
      {getSection('portfolio') && (
        <Portfolio 
          content={getSection('portfolio')!.content}
          images={imagesBySection['portfolio'] || []}
        />
      )}
      
      {getSection('contact') && (
        <Contact 
          content={getSection('contact')!.content}
          metaSettings={landingPage.meta_settings}
        />
      )}
      
      <Footer />
      <FloatingAvailability />
      
      {landingPage.meta_settings?.whatsapp_number && <WhatsAppButton />}
      {landingPage.meta_settings?.waze_link && <WazeButton />}
    </>
  )
}
