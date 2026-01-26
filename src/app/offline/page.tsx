export default function OfflinePage() {
  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Rubik, sans-serif',
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
            background: 'white',
            color: '#667eea',
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
