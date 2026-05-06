'use client'

import { Container, Row, Col } from 'react-bootstrap'

export default function HeroSection() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        direction: 'rtl',
      }}
    >
      {/* רקע דקורטיבי */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249, 147, 251, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <Container style={{ position: 'relative', zIndex: 2 }}>
        <Row className="justify-content-center">
          <Col lg={10} xl={9}>
            <div style={{ textAlign: 'center' }}>
              {/* תג עילי */}
              <div
                style={{
                  display: 'inline-block',
                  padding: '8px 24px',
                  borderRadius: '50px',
                  background: 'rgba(249, 147, 251, 0.1)',
                  border: '1px solid rgba(249, 147, 251, 0.3)',
                  marginBottom: '32px',
                  animation: 'fadeIn 0.8s ease-out',
                }}
              >
                <span
                  style={{
                    color: '#F993FB',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  ✨ מערכת ניהול נכסים מתקדמת
                </span>
              </div>

              {/* כותרת ראשית */}
              <h1
                style={{
                  fontSize: 'clamp(36px, 5vw, 64px)',
                  fontWeight: '800',
                  color: 'white',
                  marginBottom: '24px',
                  lineHeight: '1.2',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                  animation: 'slideUp 0.8s ease-out 0.2s both',
                }}
              >
                מנהלים את הצימר{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #F993FB 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  בראש שקט
                </span>
                <br />
                כל ערוצי ההזמנות במקום אחד
              </h1>

              {/* תת-כותרת */}
              <p
                style={{
                  fontSize: 'clamp(18px, 2.5vw, 24px)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  marginBottom: '48px',
                  lineHeight: '1.6',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                  maxWidth: '900px',
                  margin: '0 auto 48px',
                  animation: 'slideUp 0.8s ease-out 0.4s both',
                }}
              >
                סנכרון מלא בין Airbnb, Booking והזמנות ישירות.
                <br />
                <strong style={{ color: '#F993FB' }}>בלי דאבל-בוקינג, בלי בלבול במחירים</strong> – הכל בממשק אחד מהיר ונוח.
              </p>

              {/* כפתורי CTA */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  animation: 'slideUp 0.8s ease-out 0.6s both',
                }}
              >
                <button
                  style={{
                    padding: '16px 40px',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'white',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.3s ease',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)'
                  }}
                  onClick={() => window.location.href = '/'}
                >
                  🚀 התחילו לנהל חכם - 14 יום ניסיון חינם
                </button>

                <button
                  style={{
                    padding: '16px 40px',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  }}
                  onClick={() => {
                    const features = document.getElementById('features')
                    features?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  📖 גלה עוד
                </button>
              </div>

              {/* Social Proof */}
              <div
                style={{
                  marginTop: '64px',
                  animation: 'fadeIn 1s ease-out 0.8s both',
                }}
              >
                <p
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    marginBottom: '16px',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  מהימן על ידי בעלי צימרים ונכסי השכרה
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '32px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {/* לוגואי פלטפורמות */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/airbnb-logo.png" alt="Airbnb" style={{ height: '32px', filter: 'brightness(0) invert(1) opacity(0.7)' }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Airbnb</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/booking-logo.png" alt="Booking.com" style={{ height: '32px', filter: 'brightness(0) invert(1) opacity(0.7)' }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Booking.com</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🌐</span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>הזמנות ישירות</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  )
}
