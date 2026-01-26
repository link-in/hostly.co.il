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
        router.push('/dashboard/login')
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      color: 'white',
      fontFamily: 'Rubik, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>מתנתק...</h1>
        <p>נא להמתין</p>
      </div>
    </div>
  )
}
