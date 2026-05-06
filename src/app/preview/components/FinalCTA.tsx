'use client'

import { Container, Row, Col } from 'react-bootstrap'
import { useState } from 'react'

export default function FinalCTA() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // ניתן לשלוח את המידע לשרת או להפנות לדף התחברות
    window.location.href = '/'
  }

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #2d1b3d 50%, #1e293b 100%)',
        padding: '70px 0',
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* רקע דקורטיבי */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
          transform: 'translateY(-50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249, 147, 251, 0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
          transform: 'translateY(-50%)',
        }}
      />

      <Container style={{ position: 'relative', zIndex: 2 }}>
        <Row>
          <Col lg={8} xl={7} className="mx-auto">
            <div style={{ textAlign: 'center' }}>
              {/* אייקון */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  margin: '0 auto 32px',
                  boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)',
                }}
              >
                🚀
              </div>

              {/* כותרת */}
              <h2
                style={{
                  fontSize: 'clamp(32px, 5vw, 52px)',
                  fontWeight: '800',
                  color: 'white',
                  marginBottom: '24px',
                  lineHeight: '1.2',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                שנה את הדרך שבה אתה מנהל את הצימר שלך עוד היום
              </h2>

              {/* תת-כותרת */}
              <p
                style={{
                  fontSize: 'clamp(18px, 2.5vw, 24px)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  marginBottom: '40px',
                  lineHeight: '1.6',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                הצטרף למאות בעלי יחידות אירוח שכבר נהנים משקט נפשי,
                <br />
                <span style={{ color: '#F993FB', fontWeight: '700' }}>יותר הכנסות ופחות עבודה ידנית</span>
              </p>

              {/* טופס רישום פשוט */}
              <form
                onSubmit={handleSubmit}
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '32px',
                }}
              >
                <input
                  type="email"
                  placeholder="הכניסו את המייל שלכם"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    padding: '16px 24px',
                    fontSize: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    outline: 'none',
                    minWidth: '280px',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#F993FB'
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '18px 48px',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'white',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.5)',
                    transition: 'all 0.3s ease',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.5)'
                  }}
                >
                  🚀 התחילו ניסיון חינם עכשיו!
                </button>
              </form>

              {/* תכונות מהירות */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '32px',
                  flexWrap: 'wrap',
                  marginBottom: '48px',
                }}
              >
                {[
                  { icon: '✓', text: 'ללא כרטיס אשראי' },
                  { icon: '✓', text: '14 יום ניסיון חינם' },
                  { icon: '✓', text: 'ביטול בכל עת' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '15px',
                      fontFamily: 'Heebo, Assistant, sans-serif',
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(76, 175, 80, 0.2)',
                        color: '#4caf50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '700',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Support Note */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(76, 175, 80, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  💬
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    margin: 0,
                    textAlign: 'right',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  <strong style={{ color: 'white' }}>תמיכה מלאה בעברית</strong>
                  <br />
                  אנחנו כאן בשבילך בכל שאלה 🤝
                </p>
              </div>
            </div>
          </Col>
        </Row>

        {/* פוטר */}
        <Row className="mt-5">
          <Col className="text-center">
            <div
              style={{
                paddingTop: '40px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  margin: 0,
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                © 2026 Hostly. כל הזכויות שמורות.
                <br />
                מערכת ניהול נכסים לטווח קצר - מתקדמת, פשוטה ויעילה.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <a
                  href="/"
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    textDecoration: 'none',
                    transition: 'color 0.3s ease',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#F993FB'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  התחברות
                </a>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
                <a
                  href="#features"
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    textDecoration: 'none',
                    transition: 'color 0.3s ease',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#F993FB'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  תכונות
                </a>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
                <a
                  href="mailto:support@hostly.co.il"
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    textDecoration: 'none',
                    transition: 'color 0.3s ease',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#F993FB'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  צור קשר
                </a>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  )
}
