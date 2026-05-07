export default function AirbnbSuccessPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fce7f3 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      direction: 'rtl',
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '40px 36px',
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>
          Airbnb חובר בהצלחה!
        </h1>

        <p style={{ color: '#4b5563', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
          חשבון Airbnb שלך מחובר עכשיו למערכת Hostly.
          <br />
          ההזמנות יסונכרנו אוטומטית מעתה.
        </p>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 24,
          fontSize: 14,
          color: '#15803d',
          textAlign: 'right',
        }}>
          <strong>✓ מה קורה עכשיו?</strong>
          <ul style={{ margin: '8px 0 0', paddingRight: 20, lineHeight: 1.8 }}>
            <li>הנכס שלך מסונכרן עם Airbnb</li>
            <li>הזמנות חדשות יופיעו בדשבורד</li>
            <li>מחירים וזמינות מתעדכנים אוטומטית</li>
          </ul>
        </div>

        <a
          href="/dashboard"
          style={{
            display: 'block',
            padding: '14px 0',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
          }}
        >
          כניסה לדשבורד ←
        </a>

        <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
          אפשר לסגור את הדף הזה
        </p>
      </div>
    </div>
  )
}
