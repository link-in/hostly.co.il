'use client'

export default function OfflinePage() {
  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'var(--hn-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--htxt-1)',
        fontFamily: 'var(--font-heebo), Heebo, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</h1>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>אין חיבור לאינטרנט</h2>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
          אנא בדוק את החיבור שלך ונסה שוב
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '2rem',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            background: 'var(--hb)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          נסה שוב
        </button>
      </div>
    </div>
  )
}
