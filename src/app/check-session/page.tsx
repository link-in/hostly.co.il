'use client'

import { useSession } from 'next-auth/react'
import { SessionProvider } from 'next-auth/react'

function SessionChecker() {
  const { data: session, status } = useSession()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '40px',
      fontFamily: 'Rubik, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '12px'
      }}>
        <h1 style={{ marginBottom: '20px' }}>🔍 בדיקת Session</h1>
        
        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <strong>Status:</strong> {status}
        </div>

        {status === 'authenticated' && session?.user && (
          <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <h3>User Info:</h3>
            <pre style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: '15px', 
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '14px'
            }}>
              {JSON.stringify(session.user, null, 2)}
            </pre>
          </div>
        )}

        {status === 'unauthenticated' && (
          <div style={{ padding: '15px', background: 'rgba(255,0,0,0.2)', borderRadius: '8px' }}>
            <strong>❌ לא מחובר</strong>
            <p>יש להתחבר תחילה</p>
            <a href="/dashboard/login" style={{ color: 'white', textDecoration: 'underline' }}>
              לחץ כאן להתחברות
            </a>
          </div>
        )}

        {status === 'loading' && (
          <div style={{ padding: '15px', background: 'rgba(255,255,0,0.2)', borderRadius: '8px' }}>
            ⏳ טוען...
          </div>
        )}

        <div style={{ marginTop: '30px' }}>
          <a href="/dashboard" style={{ 
            display: 'inline-block',
            padding: '10px 20px', 
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            marginRight: '10px'
          }}>
            ← חזרה לדשבורד
          </a>
          <a href="/admin/users" style={{ 
            display: 'inline-block',
            padding: '10px 20px', 
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px'
          }}>
            נסה להיכנס ל-Admin →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function CheckSessionPage() {
  return (
    <SessionProvider>
      <SessionChecker />
    </SessionProvider>
  )
}
