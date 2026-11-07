'use client'

import { signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * TEMPORARY PAGE - Force logout
 * DELETE THIS FILE AFTER USE!
 */
export default function ForceLogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const doLogout = async () => {
      await signOut({ redirect: false })
      
      // Clear all cookies manually
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      
      // Wait a bit then redirect
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
    
    doLogout()
  }, [router])

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'var(--hn-50)',
      color: 'var(--htxt-2)',
      fontFamily: 'var(--font-heebo), Heebo, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>מתנתק...</h1>
        <p>נא להמתין</p>
      </div>
    </div>
  )
}
