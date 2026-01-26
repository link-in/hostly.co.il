'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'

export default function LandingEditor() {
  const { data: session } = useSession()
  const [logoSrc, setLogoSrc] = useState('/photos/hostly-logo.png')
  const [logoVisible, setLogoVisible] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('meta')
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean
    type: 'success' | 'error'
    message: string
  }>({ show: false, type: 'success', message: '' })
  const [data, setData] = useState<any>({
    landingPage: null,
    sections: [],
    images: []
  })

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [notification.show])

  // State למטא דאטה
  const [subdomain, setSubdomain] = useState('')
  const [siteTitle, setSiteTitle] = useState('')
  const [siteSubtitle, setSiteSubtitle] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [wazeLink, setWazeLink] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')

  // State ל-Hero
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')
  const [uploadingHero, setUploadingHero] = useState(false)

  // State ל-Features
  const [featuresTitle, setFeaturesTitle] = useState('')
  const [featuresDescription, setFeaturesDescription] = useState('')
  const [featuresItems, setFeaturesItems] = useState<Array<{ icon: string; title: string }>>([])
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<number | null>(null)

  // State ל-Portfolio
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)

  // רשימת אמוג'י לבחירה
  const emojiList = ['🛏️', '🏠', '🏡', '🏨', '🚿', '🛁', '🍽️', '☕', '🍳', '📶', '📺', '❄️', '🔥', '🚗', '🅿️', '🔑', '🚪', '🌳', '🏊', '🧖', '🏔️', '🌅', '🏞️', '⭐', '💎', '👨‍👩‍👧‍👦', '👶', '🐕']

  useEffect(() => {
    fetchData()
  }, [])

  // סגור emoji picker כשלוחצים מחוץ לו
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerOpen !== null) {
        const target = e.target as HTMLElement
        if (!target.closest('.emoji-picker-container')) {
          setEmojiPickerOpen(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [emojiPickerOpen])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/landing')
      const result = await res.json()
      setData(result)
      
      // טען מטא דאטה
      if (result.landingPage) {
        setSubdomain(result.landingPage.subdomain || '')
        setSiteTitle(result.landingPage.site_title || '')
        setSiteSubtitle(result.landingPage.site_subtitle || '')
        setWhatsappNumber(result.landingPage.meta_settings?.whatsapp_number || '')
        setWazeLink(result.landingPage.meta_settings?.waze_link || '')
        setPhone(result.landingPage.meta_settings?.phone || '')
        setEmail(result.landingPage.meta_settings?.email || '')
        setAddress(result.landingPage.meta_settings?.address || '')
      }
      
      // טען Hero
      const heroSection = result.sections.find((s: any) => s.section_type === 'hero')
      if (heroSection) {
        setHeroTitle(heroSection.content.title || '')
        setHeroSubtitle(heroSection.content.subtitle || '')
      }
      
      // טען Features
      const featuresSection = result.sections.find((s: any) => s.section_type === 'features')
      if (featuresSection) {
        setFeaturesTitle(featuresSection.content.title || '')
        setFeaturesDescription(featuresSection.content.description || '')
        setFeaturesItems(featuresSection.content.items || [])
      }
      
    } finally {
      setLoading(false)
    }
  }

  const saveMeta = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_meta',
          subdomain,
          siteTitle,
          siteSubtitle,
          metaSettings: {
            whatsapp_number: whatsappNumber,
            waze_link: wazeLink,
            phone,
            email,
            address
          }
        })
      })
      
      if (res.ok) {
        setNotification({ show: true, type: 'success', message: 'נשמר בהצלחה!' })
        fetchData()
      } else {
        const errorData = await res.json()
        setNotification({ show: true, type: 'error', message: errorData.error || 'שגיאה בשמירה' })
      }
    } finally {
      setSaving(false)
    }
  }

  const saveHero = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_section',
          sectionType: 'hero',
          content: {
            title: heroTitle,
            subtitle: heroSubtitle
          }
        })
      })
      
      if (res.ok) {
        setNotification({ show: true, type: 'success', message: 'נשמר בהצלחה!' })
        fetchData()
      }
    } finally {
      setSaving(false)
    }
  }

  const saveFeatures = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_section',
          sectionType: 'features',
          content: {
            title: featuresTitle,
            description: featuresDescription,
            items: featuresItems
          }
        })
      })
      
      if (res.ok) {
        setNotification({ show: true, type: 'success', message: 'נשמר בהצלחה!' })
        fetchData()
      }
    } finally {
      setSaving(false)
    }
  }

  const uploadImage = async (file: File, sectionType: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sectionType', sectionType)
    
    const res = await fetch('/api/landing/upload', {
      method: 'POST',
      body: formData
    })
    
    console.log('Upload response status:', res.status, res.statusText)
    
    if (res.ok) {
      const result = await res.json()
      console.log('Upload successful:', result)
      await fetchData() // רענן נתונים
      return true
    } else {
      let errorMessage = 'Upload failed'
      try {
        const error = await res.json()
        console.error('Upload failed (JSON):', error)
        errorMessage = error.error || JSON.stringify(error) || errorMessage
      } catch (e) {
        // אם לא JSON, נסה text
        const errorText = await res.text()
        console.error('Upload failed (Text):', errorText)
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }
  }

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploadingHero(true)
    try {
      let successCount = 0
      let failCount = 0
      
      // העלה את כל התמונות בזו אחר זו
      for (let i = 0; i < files.length; i++) {
        try {
          const success = await uploadImage(files[i], 'hero')
          if (success) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          console.error('Upload error for file:', files[i].name, error)
          failCount++
        }
      }
      
      // הצג הודעה מסכמת
      if (successCount > 0 && failCount === 0) {
        setNotification({ 
          show: true, 
          type: 'success', 
          message: `${successCount} תמונות הועלו בהצלחה!` 
        })
      } else if (successCount > 0 && failCount > 0) {
        setNotification({ 
          show: true, 
          type: 'success', 
          message: `${successCount} הועלו בהצלחה, ${failCount} נכשלו` 
        })
      } else {
        setNotification({ 
          show: true, 
          type: 'error', 
          message: 'שגיאה בהעלאת התמונות' 
        })
      }
      
      // נקה את ה-input כדי שאפשר יהיה להעלות שוב את אותם קבצים
      e.target.value = ''
    } finally {
      setUploadingHero(false)
    }
  }

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploadingPortfolio(true)
    try {
      let successCount = 0
      let failCount = 0
      
      // העלה את כל התמונות בזו אחר זו
      for (let i = 0; i < files.length; i++) {
        try {
          const success = await uploadImage(files[i], 'portfolio')
          if (success) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          console.error('Upload error for file:', files[i].name, error)
          failCount++
        }
      }
      
      // הצג הודעה מסכמת
      if (successCount > 0 && failCount === 0) {
        setNotification({ 
          show: true, 
          type: 'success', 
          message: `${successCount} תמונות הועלו בהצלחה!` 
        })
      } else if (successCount > 0 && failCount > 0) {
        setNotification({ 
          show: true, 
          type: 'success', 
          message: `${successCount} הועלו בהצלחה, ${failCount} נכשלו` 
        })
      } else {
        setNotification({ 
          show: true, 
          type: 'error', 
          message: 'שגיאה בהעלאת התמונות' 
        })
      }
      
      // נקה את ה-input כדי שאפשר יהיה להעלות שוב את אותם קבצים
      e.target.value = ''
    } finally {
      setUploadingPortfolio(false)
    }
  }

  const deleteImage = async (imageId: string) => {
    if (!confirm('למחוק תמונה זו?')) return
    
    try {
      const res = await fetch(`/api/landing/upload?id=${imageId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        setNotification({ show: true, type: 'success', message: 'תמונה נמחקה!' })
        fetchData()
      } else {
        setNotification({ show: true, type: 'error', message: 'שגיאה במחיקה' })
      }
    } catch (error) {
      setNotification({ show: true, type: 'error', message: 'שגיאה במחיקה' })
    }
  }

  const selectEmoji = (idx: number, emoji: string) => {
    const newItems = [...featuresItems]
    newItems[idx].icon = emoji
    setFeaturesItems(newItems)
    setEmojiPickerOpen(null)
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '24px' }}>טוען...</div>
      </div>
    )
  }

  const tabs = [
    { id: 'meta', label: '⚙️ הגדרות כלליות' },
    { id: 'hero', label: '📸 גלריה ראשית' },
    { id: 'features', label: '✨ תכונות' },
    { id: 'portfolio', label: '🖼️ גלריית תמונות' },
  ]

  const heroImages = data.images.filter((img: any) => img.section_type === 'hero')
  const portfolioImages = data.images.filter((img: any) => img.section_type === 'portfolio')
  
  const previewUrl = data.landingPage?.subdomain 
    ? `https://${data.landingPage.subdomain}.hostly.co.il` 
    : null

  return (
    <div dir="rtl" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: '40px 20px'
    }}>
      {/* Notification Toast */}
      {notification.show && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            minWidth: '300px',
            maxWidth: '500px',
            backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>
              {notification.type === 'success' ? '✅' : '❌'}
            </span>
            <span style={{ fontWeight: '500' }}>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 5px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      
      {/* Header */}
      <div style={{ maxWidth: '1296px', margin: '0 auto 20px' }}>
        <div 
          className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between mb-3 gap-3"
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="d-flex align-items-center gap-3">
            {logoVisible ? (
              <img
                src={logoSrc}
                alt="Hostly"
                style={{ height: '48px', objectFit: 'contain' }}
                onError={() => setLogoVisible(false)}
              />
            ) : null}
            <div>
              <h1 
                className="fw-bold mb-1"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: '1.75rem'
                }}
              >
                ניהול דף נחיתה
              </h1>
              {session?.user?.firstName && session?.user?.lastName ? (
                <p className="small mb-0" style={{ color: '#667eea', fontWeight: '500' }}>
                  שלום {session.user.firstName} {session.user.lastName}
                </p>
              ) : null}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 position-relative justify-content-center justify-content-lg-start">
            <Link href="/dashboard">
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{ 
                  width: '36px',
                  height: '36px',
                  border: '1px solid #667eea',
                  color: '#667eea',
                  backgroundColor: 'transparent',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#667eea'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#667eea'
                }}
                title="דף הבית"
                aria-label="דף הבית"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>
            </Link>
            {previewUrl && (
              <a 
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{ 
                  width: '36px',
                  height: '36px',
                  border: '1px solid #28a745',
                  color: '#28a745',
                  backgroundColor: 'transparent',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#28a745'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#28a745'
                }}
                title="תצוגה מקדימה"
                aria-label="תצוגה מקדימה"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </a>
            )}
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center justify-content-center"
              style={{ 
                width: '36px',
                height: '36px',
                border: '1px solid #764ba2',
                color: '#764ba2',
                backgroundColor: 'transparent',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#764ba2'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#764ba2'
              }}
              onClick={async () => {
                await signOut({ redirect: false })
                window.location.href = '/dashboard/login'
              }}
              title="התנתק"
              aria-label="התנתק"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center justify-content-center"
              style={{ 
                width: '36px', 
                height: '36px',
                border: '1px solid #667eea',
                color: '#667eea',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#667eea'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#667eea'
              }}
              aria-label="תפריט"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span style={{ display: 'inline-block', lineHeight: 1 }}>☰</span>
            </button>
            {menuOpen ? (
              <div
                className="position-absolute bg-white border rounded-3 shadow-sm p-2"
                style={{ top: '46px', right: 0, minWidth: '200px', zIndex: 10 }}
              >
                <Link className="dropdown-item py-2" href="/dashboard" onClick={() => setMenuOpen(false)}>
                  ניהול זמינות/מחירים
                </Link>
                <Link className="dropdown-item py-2" href="/dashboard/profile" onClick={() => setMenuOpen(false)}>
                  איזור אישי
                </Link>
                <Link className="dropdown-item py-2" href="/dashboard/landing" onClick={() => setMenuOpen(false)}>
                  ניהול דף נחיתה
                </Link>
                <Link className="dropdown-item py-2" href="/dashboard/payments" onClick={() => setMenuOpen(false)}>
                  סליקת אשראי
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: '1296px', margin: '0 auto 20px' }}>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          overflowX: 'auto',
          padding: '10px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={{
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#f8f9fa',
                color: activeTab === tab.id ? 'white' : '#333',
                border: 'none',
                whiteSpace: 'nowrap',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Content */}
      <div style={{ maxWidth: '1296px', margin: '0 auto' }}>
        <div className="card shadow" style={{ borderRadius: '16px', padding: '30px' }}>
          
          {/* הגדרות כלליות */}
          {activeTab === 'meta' && (
            <div className="row g-4">
              <div className="col-12">
                <h3>⚙️ הגדרות כלליות</h3>
                <p className="text-muted">הגדר את פרטי האתר והקישורים</p>
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">כתובת אתר (subdomain)</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="dalit"
                  />
                  <span className="input-group-text">.hostly.co.il</span>
                </div>
                <small className="text-muted">אותיות אנגליות קטנות, מספרים ומקף בלבד</small>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-bold">כותרת אתר</label>
                <input
                  type="text"
                  className="form-control"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  placeholder="נוף הרים בדפנה"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-bold">תת-כותרת אתר</label>
                <input
                  type="text"
                  className="form-control"
                  value={siteSubtitle}
                  onChange={(e) => setSiteSubtitle(e.target.value)}
                  placeholder="בין פלגי הדן אל מול נופי חרמון"
                />
              </div>

              <hr />

              <div className="col-12">
                <h5>📞 פרטי יצירת קשר</h5>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-bold">WhatsApp</label>
                <input
                  type="tel"
                  className="form-control"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="972501234567"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-bold">קישור Waze</label>
                <input
                  type="url"
                  className="form-control"
                  value={wazeLink}
                  onChange={(e) => setWazeLink(e.target.value)}
                  placeholder="https://waze.com/..."
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-bold">טלפון</label>
                <input
                  type="tel"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="052-1234567"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-bold">אימייל</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@example.com"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-bold">כתובת</label>
                <input
                  type="text"
                  className="form-control"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="קיבוץ דפנה"
                />
              </div>

              <div className="col-12">
                <button
                  className="btn btn-lg w-100"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white',
                  }}
                  onClick={saveMeta}
                  disabled={saving}
                >
                  {saving ? '⏳ שומר...' : '💾 שמור שינויים'}
                </button>
              </div>

              {previewUrl && (
                <div className="col-12">
                  <div className="alert alert-success">
                    <strong>🌐 הדף שלך:</strong>{' '}
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                      {previewUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hero Editor */}
          {activeTab === 'hero' && (
            <div className="row g-4">
              <div className="col-12">
                <h3>📸 גלריה ראשית (Hero Slider)</h3>
                <p className="text-muted">תמונות אלו יוצגו בסליידר בראש הדף</p>
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">כותרת (אופציונלי)</label>
                <input
                  type="text"
                  className="form-control"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="לא חובה - יוצג הכותרת הראשית"
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">תת-כותרת (אופציונלי)</label>
                <input
                  type="text"
                  className="form-control"
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="לא חובה"
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">תמונות הסליידר ({heroImages.length})</label>
                <div className="row g-3">
                  {heroImages.map((img: any) => (
                    <div key={img.id} className="col-md-3">
                      <div style={{ position: 'relative', height: '200px', borderRadius: '8px', overflow: 'hidden' }}>
                        <Image 
                          src={img.public_url} 
                          alt="Hero"
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => deleteImage(img.id)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'rgba(255,0,0,0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            zIndex: 10
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-12">
                <label className="btn btn-outline-primary">
                  {uploadingHero ? '⏳ מעלה...' : '➕ הוסף תמונות'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleHeroUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingHero}
                  />
                </label>
                <small className="text-muted d-block mt-2">
                  💡 ניתן לבחור מספר תמונות בבת אחת
                </small>
              </div>

              <div className="col-12">
                <button
                  className="btn btn-lg w-100"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white',
                  }}
                  onClick={saveHero}
                  disabled={saving}
                >
                  {saving ? '⏳ שומר...' : '💾 שמור טקסטים'}
                </button>
              </div>
            </div>
          )}

          {/* Features Editor */}
          {activeTab === 'features' && (
            <div className="row g-4">
              <div className="col-12">
                <h3>✨ תכונות</h3>
                <p className="text-muted">ערוך את התכונות המוצגות בדף</p>
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">כותרת</label>
                <input
                  type="text"
                  className="form-control"
                  value={featuresTitle}
                  onChange={(e) => setFeaturesTitle(e.target.value)}
                  placeholder="בין פלגי הדן אל מול נופי חרמון"
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">תיאור</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={featuresDescription}
                  onChange={(e) => setFeaturesDescription(e.target.value)}
                  placeholder="היחידה שלנו מציעה לכם חוויה מושלמת"
                />
              </div>

              <div className="col-12">
                <h5>רשימת תכונות (6 פריטים)</h5>
                <small className="text-muted d-block mb-3">
                  💡 טיפ: לחץ על שדה האייקון כדי לבחור אמוג'י מהרשימה
                </small>
                {featuresItems.map((item, idx) => (
                  <div key={idx} className="row g-2 mb-3 align-items-center">
                    <div className="col-md-2">
                      <div className="emoji-picker-container" style={{ position: 'relative' }}>
                        <div
                          onClick={() => setEmojiPickerOpen(emojiPickerOpen === idx ? null : idx)}
                          style={{ 
                            fontSize: '32px', 
                            height: '70px',
                            backgroundColor: item.icon ? 'white' : '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#667eea'
                            e.currentTarget.style.backgroundColor = item.icon ? '#f8f9ff' : '#f0f0f5'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#dee2e6'
                            e.currentTarget.style.backgroundColor = item.icon ? 'white' : '#f8f9fa'
                          }}
                          title="לחץ לבחירת אמוג'י"
                        >
                          {item.icon || (
                            <span style={{ fontSize: '11px', color: '#999' }}>בחר אמוג'י</span>
                          )}
                        </div>
                        
                        {/* Emoji Picker Dropdown */}
                        {emojiPickerOpen === idx && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '75px',
                              left: 0,
                              right: 0,
                              backgroundColor: 'white',
                              border: '2px solid #667eea',
                              borderRadius: '8px',
                              padding: '10px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 1000,
                              maxHeight: '250px',
                              overflowY: 'auto',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(4, 1fr)',
                              gap: '5px'
                            }}
                          >
                            {emojiList.map((emoji, emojiIdx) => (
                              <button
                                key={emojiIdx}
                                type="button"
                                onClick={() => selectEmoji(idx, emoji)}
                                style={{
                                  fontSize: '28px',
                                  padding: '8px',
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  borderRadius: '6px',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f5'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <small style={{ 
                          position: 'absolute', 
                          bottom: '-18px', 
                          left: '50%', 
                          transform: 'translateX(-50%)',
                          whiteSpace: 'nowrap',
                          fontSize: '11px',
                          color: '#666'
                        }}>
                          אייקון
                        </small>
                      </div>
                    </div>
                    <div className="col-md-10">
                      <input
                        type="text"
                        className="form-control"
                        style={{ height: '70px', fontSize: '16px' }}
                        value={item.title}
                        onChange={(e) => {
                          const newItems = [...featuresItems]
                          newItems[idx].title = e.target.value
                          setFeaturesItems(newItems)
                        }}
                        placeholder="תיאור התכונה"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-12">
                <button
                  className="btn btn-lg w-100"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white',
                  }}
                  onClick={saveFeatures}
                  disabled={saving}
                >
                  {saving ? '⏳ שומר...' : '💾 שמור שינויים'}
                </button>
              </div>
            </div>
          )}

          {/* Portfolio Editor */}
          {activeTab === 'portfolio' && (
            <div className="row g-4">
              <div className="col-12">
                <h3>🖼️ גלריית תמונות</h3>
                <p className="text-muted">העלה תמונות שיוצגו בגריד</p>
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">תמונות ({portfolioImages.length})</label>
                <div className="row g-3">
                  {portfolioImages.map((img: any) => (
                    <div key={img.id} className="col-md-3">
                      <div style={{ position: 'relative', height: '200px', borderRadius: '8px', overflow: 'hidden' }}>
                        <Image 
                          src={img.public_url} 
                          alt="Portfolio"
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => deleteImage(img.id)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'rgba(255,0,0,0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            zIndex: 10
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-12">
                <label className="btn btn-outline-primary btn-lg">
                  {uploadingPortfolio ? '⏳ מעלה...' : '➕ הוסף תמונות'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePortfolioUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingPortfolio}
                  />
                </label>
                <small className="text-muted d-block mt-2">
                  💡 ניתן לבחור מספר תמונות בבת אחת
                </small>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  )
}
