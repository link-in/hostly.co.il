'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function HomeLanding() {
  const router = useRouter()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: mode === 'register' ? '/dashboard/onboarding' : '/dashboard' })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      const result = await signIn('credentials', { email: loginEmail, password: loginPassword, redirect: false })
      if (result?.error) { setLoginError('אימייל או סיסמה שגויים'); return }
      if (result?.ok) router.push('/dashboard')
    } catch { setLoginError('שגיאה בהתחברות') }
    finally { setLoginLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError(null)
    if (regPassword !== regConfirm) { setRegError('הסיסמאות אינן תואמות'); return }
    setRegLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword, displayName: regName }),
      })
      const data = await res.json()
      if (!res.ok) { setRegError(data.error ?? 'שגיאה ביצירת חשבון'); return }
      const result = await signIn('credentials', { email: regEmail, password: regPassword, redirect: false })
      if (result?.ok) router.push('/dashboard/onboarding')
      else setRegError('החשבון נוצר — נסה להתחבר')
    } catch { setRegError('שגיאה, נסה שוב') }
    finally { setRegLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', textAlign: 'right',
  }

  const isLoading = loginLoading || regLoading || googleLoading

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floating { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .home-card { animation: fadeInUp 0.6s ease-out forwards; }
        .home-logo { animation: floating 3s ease-in-out infinite; }
        .hbtn { transition: all 0.2s ease; }
        .hbtn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(102,126,234,0.35) !important; }
      `}</style>

      <main dir="rtl" style={{ minHeight:'100vh', background:'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', overflow:'hidden', position:'relative' }}>
        {/* Background circles */}
        <div style={{ position:'absolute', top:'10%', right:'10%', width:'300px', height:'300px', background:'rgba(255,255,255,0.1)', borderRadius:'50%', filter:'blur(60px)' }} />
        <div style={{ position:'absolute', bottom:'10%', left:'10%', width:'250px', height:'250px', background:'rgba(255,255,255,0.08)', borderRadius:'50%', filter:'blur(50px)' }} />

        <div className="home-card" style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'420px' }}>
          <div style={{ backgroundColor:'white', borderRadius:'24px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', padding:'36px 32px', textAlign:'center' }}>

            {/* Logo — centered explicitly */}
            <div className="home-logo" style={{ display:'flex', justifyContent:'center', marginBottom:'16px' }}>
              <Image src="/photos/hostly-logo.png" alt="Hostly" width={80} height={80} style={{ objectFit:'contain' }} />
            </div>

            <p style={{ color:'#6b7280', fontSize:'14px', margin:'0 0 24px' }}>
              מערכת ניהול נכסים חכמה לטווח קצר
            </p>

            {/* Mode tabs */}
            <div style={{ display:'flex', background:'#f3f4f6', borderRadius:'12px', padding:'4px', marginBottom:'22px' }}>
              {(['login','register'] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setLoginError(null); setRegError(null) }}
                  style={{ flex:1, padding:'9px', borderRadius:'9px', border:'none', fontWeight:600, fontSize:'14px', cursor:'pointer', transition:'all .2s',
                    background: mode===m ? 'white' : 'transparent',
                    color: mode===m ? '#667eea' : '#6b7280',
                    boxShadow: mode===m ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  }}>
                  {m === 'login' ? 'כניסה' : 'הרשמה חינמית'}
                </button>
              ))}
            </div>

            {/* Error */}
            {(loginError || regError) && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', borderRadius:'10px', padding:'10px 14px', fontSize:'14px', marginBottom:'16px', textAlign:'right' }}>
                ⚠️ {loginError || regError}
              </div>
            )}

            {/* Google button */}
            <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="hbtn"
              style={{ width:'100%', background:'white', border:'2px solid #e5e7eb', color:'#374151', padding:'13px 16px', fontSize:'15px', fontWeight:600, borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'14px' }}>
              {googleLoading ? <span style={{ width:'20px', height:'20px', border:'2px solid #667eea', borderTop:'2px solid transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} /> : (
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              )}
              {googleLoading ? 'מתחבר...' : mode === 'login' ? 'כניסה עם Google' : 'הרשמה עם Google'}
            </button>

            {/* Divider */}
            <div style={{ position:'relative', marginBottom:'14px' }}>
              <hr style={{ margin:0, border:'none', borderTop:'1px solid #e5e7eb' }} />
              <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'white', padding:'0 10px', fontSize:'12px', color:'#9ca3af' }}>או</span>
            </div>

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom:'12px', textAlign:'right' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>אימייל</label>
                  <input type="email" placeholder="your@email.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required disabled={isLoading} style={{ ...inputStyle, direction:'ltr', textAlign:'left' }} />
                </div>
                <div style={{ marginBottom:'18px', textAlign:'right' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>סיסמה</label>
                  <input type="password" placeholder="••••••••" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required disabled={isLoading} style={inputStyle} />
                </div>
                <button type="submit" disabled={isLoading} className="hbtn"
                  style={{ width:'100%', padding:'13px', background: isLoading ? '#cbd5e1' : 'linear-gradient(135deg,#667eea,#764ba2)', border:'none', borderRadius:'12px', color:'white', fontSize:'15px', fontWeight:600, cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow:'0 4px 12px rgba(102,126,234,0.3)' }}>
                  {loginLoading ? 'מתחבר...' : '🔐 כניסה'}
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom:'10px', textAlign:'right' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>שם הנכס / שם תצוגה <span style={{color:'#dc2626'}}>*</span></label>
                  <input type="text" placeholder="דירת חוף תל אביב" value={regName} onChange={e=>setRegName(e.target.value)} required disabled={isLoading} style={inputStyle} />
                </div>
                <div style={{ marginBottom:'10px', textAlign:'right' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>אימייל <span style={{color:'#dc2626'}}>*</span></label>
                  <input type="email" placeholder="your@email.com" value={regEmail} onChange={e=>setRegEmail(e.target.value)} required disabled={isLoading} style={{ ...inputStyle, direction:'ltr', textAlign:'left' }} />
                </div>
                <div style={{ marginBottom:'10px', textAlign:'right' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>סיסמה <span style={{color:'#dc2626'}}>*</span></label>
                  <input type="password" placeholder="לפחות 6 תווים" value={regPassword} onChange={e=>setRegPassword(e.target.value)} required minLength={6} disabled={isLoading} style={inputStyle} />
                </div>
                <div style={{ marginBottom:'18px', textAlign:'right' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>אימות סיסמה <span style={{color:'#dc2626'}}>*</span></label>
                  <input type="password" placeholder="הזן שוב" value={regConfirm} onChange={e=>setRegConfirm(e.target.value)} required disabled={isLoading} style={inputStyle} />
                </div>
                <button type="submit" disabled={isLoading} className="hbtn"
                  style={{ width:'100%', padding:'13px', background: isLoading ? '#cbd5e1' : 'linear-gradient(135deg,#667eea,#764ba2)', border:'none', borderRadius:'12px', color:'white', fontSize:'15px', fontWeight:600, cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow:'0 4px 12px rgba(102,126,234,0.3)' }}>
                  {regLoading ? 'יוצר חשבון...' : '🚀 צור חשבון — 14 יום ניסיון חינם'}
                </button>
              </form>
            )}

            {/* Demo link */}
            <p style={{ fontSize:'12px', color:'#9ca3af', marginTop:'16px', marginBottom:0 }}>
              רוצה לנסות?{' '}
              <a href="/demo" style={{ color:'#667eea', fontWeight:600, textDecoration:'none' }}>כניסה למצב דמו</a>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
