'use client'

interface CheckInHeaderProps {
  propertyName: string
}

export default function CheckInHeader({ propertyName }: CheckInHeaderProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '0 0 30px 30px',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
        🏡
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
        צ'ק-אין דיגיטלי
      </h1>
      <p style={{ fontSize: '1.1rem', margin: 0, opacity: 0.9 }}>
        {propertyName}
      </p>
    </div>
  )
}
