'use client'

import { Container, Row, Col } from 'react-bootstrap'
import { Icon } from '@iconify/react'

export default function DataMarketing() {
  return (
    <section
      style={{
        background: 'white',
        padding: '60px 0',
        direction: 'rtl',
      }}
    >
      <Container>
        <Row>
          <Col lg={10} xl={8} className="mx-auto">
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2
                style={{
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '16px',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                הלקוחות שלך – הנכס הגדול ביותר שלך 💎
              </h2>
              <p
                style={{
                  fontSize: '18px',
                  color: '#64748b',
                  lineHeight: '1.8',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                בנו קשרים ארוכי טווח והפכו אורחים חד-פעמיים ללקוחות קבועים
              </p>
            </div>
          </Col>
        </Row>

        <Row className="g-5 align-items-center mb-5">
          <Col lg={6} className="mx-auto text-center">
            <div
              style={{
                background: 'white',
                padding: '48px 40px',
                borderRadius: '24px',
                border: '3px solid #667eea',
                boxShadow: '0 12px 40px rgba(102, 126, 234, 0.15)',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <Icon icon="mdi:account-group" style={{ fontSize: '40px', color: 'white' }} />
              </div>
              <h3
                style={{
                  fontSize: 'clamp(24px, 3vw, 32px)',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '20px',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                המערכת שומרת את מאגר הטלפונים של הלקוחות
              </h3>
              <p
                style={{
                  fontSize: '18px',
                  color: '#64748b',
                  lineHeight: '1.8',
                  marginBottom: '32px',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                בנה מועדון לקוחות, שלח מבצעים וקדם הזמנות חוזרות בקלות.
                <br />
                <strong style={{ color: '#667eea' }}>הלקוחות שלך נשארים שלך - לתמיד.</strong>
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'right' }}>
                {[
                  'שמירת פרטי קשר ומידע על כל אורח',
                  'שליחת מבצעים והטבות ללקוחות חוזרים',
                  'בניית מועדון נאמנות שמגדיל הכנסות',
                  'יצירת קשר ישירה דרך WhatsApp',
                ].map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '14px',
                      fontSize: '16px',
                      color: '#475569',
                      fontFamily: 'Heebo, Assistant, sans-serif',
                    }}
                  >
                    <Icon icon="mdi:check-circle" style={{ fontSize: '24px', color: '#4caf50', flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Col>
        </Row>

      </Container>
    </section>
  )
}
