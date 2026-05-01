'use client'

import { useEffect, useState } from 'react'
import { X, Share, Plus } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [showIOSBanner, setShowIOSBanner] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showAndroidBanner, setShowAndroidBanner] = useState(false)

  useEffect(() => {
    // Mobile only — skip on desktop (width > 768px)
    if (window.innerWidth > 768) return

    // Don't show if already running as PWA (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) return

    // Don't show if user previously dismissed
    const dismissed = localStorage.getItem('pwa-banner-dismissed')
    if (dismissed) return

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    if (isIOS) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setShowIOSBanner(true), 2000)
      return () => clearTimeout(timer)
    }

    // Android / Chrome - listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowAndroidBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', '1')
    setShowIOSBanner(false)
    setShowAndroidBanner(false)
  }

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowAndroidBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (showIOSBanner) {
    return (
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '16px 20px 28px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="סגור"
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/photos/hostly-logo.png"
            alt="Hostly"
            style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }}
          />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '16px' }}>התקן את Hostly</p>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.85 }}>
              הוסף למסך הבית לגישה מהירה
            </p>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '13px',
            lineHeight: '1.8',
          }}
        >
          <p style={{ margin: 0 }}>
            <span>1. לחץ על כפתור השיתוף </span>
            <Share size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </p>
          <p style={{ margin: 0 }}>
            <span>2. בחר </span>
            <strong>&quot;הוסף למסך הבית&quot;</strong>
            <span> </span>
            <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </p>
          <p style={{ margin: 0 }}>3. לחץ <strong>&quot;הוסף&quot;</strong></p>
        </div>
      </div>
    )
  }

  if (showAndroidBanner) {
    return (
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '16px 20px 28px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="סגור"
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <X size={16} />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/photos/hostly-logo.png"
          alt="Hostly"
          style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }}
        />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>התקן את Hostly</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>
            גישה מהירה ישירות מהמסך הראשי
          </p>
        </div>
        <button
          onClick={handleAndroidInstall}
          style={{
            background: '#fff',
            color: '#667eea',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          התקן
        </button>
      </div>
    )
  }

  return null
}
