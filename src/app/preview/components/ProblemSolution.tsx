'use client'

import { Container, Row, Col } from 'react-bootstrap'
import { Icon } from '@iconify/react'

export default function ProblemSolution() {
  return (
    <section
      style={{
        background: 'white',
        padding: '60px 0',
        direction: 'rtl',
      }}
    >
      <Container>
        {/* כותרת */}
        <Row className="mb-4">
          <Col className="text-center">
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '16px',
                fontFamily: 'Heebo, Assistant, sans-serif',
              }}
            >
              איך היה <span style={{ color: '#ef5350' }}>לפני</span> המערכת vs{' '}
              <span style={{ color: '#4caf50' }}>אחרי</span> המערכת
            </h2>
            <p
              style={{
                fontSize: '18px',
                color: '#64748b',
                fontFamily: 'Heebo, Assistant, sans-serif',
              }}
            >
              תראו את ההבדל המשמעותי
            </p>
          </Col>
        </Row>

        {/* השוואת לפני/אחרי */}
        <Row className="g-3">
          <Col lg={6}>
            {/* לפני - צד שמאלי (אדום) */}
            <div
              style={{
                background: 'linear-gradient(135deg, #fee 0%, #fdd 100%)',
                border: '3px solid #ef5350',
                borderRadius: '20px',
                padding: '32px 28px',
                height: '100%',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: '12px',
                  }}
                >
                  😫
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#ef5350',
                    marginBottom: '8px',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  לפני המערכת
                </h3>
                <p
                  style={{
                    fontSize: '16px',
                    color: '#b71c1c',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  כאוס וסטרס יומיומי
                </p>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { icon: 'mdi:close-circle', text: 'עדכון ידני ב-3 אתרים שונים' },
                  { icon: 'mdi:close-circle', text: 'פחד מתמיד מדאבל-בוקינג' },
                  { icon: 'mdi:close-circle', text: 'רדיפה אחרי אורחים למסמכים' },
                  { icon: 'mdi:close-circle', text: 'שכחת לעדכן מחיר? איבדת כסף' },
                  { icon: 'mdi:close-circle', text: 'מיילים ווטסאפים פזורים בכל מקום' },
                  { icon: 'mdi:close-circle', text: 'חשבוניות ידניות וטעויות חשבונאות' },
                ].map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '14px',
                      fontSize: '16px',
                      color: '#c62828',
                      fontFamily: 'Heebo, Assistant, sans-serif',
                    }}
                  >
                    <Icon icon={item.icon} style={{ fontSize: '24px', color: '#ef5350', flexShrink: 0 }} />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Col>

          <Col lg={6}>
            {/* אחרי - צד ימני (ירוק) */}
            <div
              style={{
                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                border: '3px solid #4caf50',
                borderRadius: '20px',
                padding: '32px 28px',
                height: '100%',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: '12px',
                  }}
                >
                  🎉
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#4caf50',
                    marginBottom: '8px',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  אחרי המערכת
                </h3>
                <p
                  style={{
                    fontSize: '16px',
                    color: '#2e7d32',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  אוטומציה מלאה ושקט נפשי
                </p>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { icon: 'mdi:check-circle', text: 'סנכרון אוטומטי בכל הפלטפורמות' },
                  { icon: 'mdi:check-circle', text: 'אפס סיכוי לדאבל-בוקינג' },
                  { icon: 'mdi:check-circle', text: 'צ\'ק-אין אוטומטי בוואטסאפ' },
                  { icon: 'mdi:check-circle', text: 'מחירים חכמים ומעודכנים תמיד' },
                  { icon: 'mdi:check-circle', text: 'כל המידע במקום אחד מסודר' },
                  { icon: 'mdi:check-circle', text: 'חשבוניות אוטומטיות ללא טעויות' },
                ].map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '14px',
                      fontSize: '16px',
                      color: '#2e7d32',
                      fontFamily: 'Heebo, Assistant, sans-serif',
                    }}
                  >
                    <Icon icon={item.icon} style={{ fontSize: '24px', color: '#4caf50', flexShrink: 0 }} />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Col>
        </Row>

        {/* התוצאה */}
        <Row className="mt-4">
          <Col lg={10} className="mx-auto text-center">
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '32px 40px',
                borderRadius: '20px',
                boxShadow: '0 12px 32px rgba(102, 126, 234, 0.3)',
              }}
            >
              <h3
                style={{
                  fontSize: 'clamp(20px, 3vw, 28px)',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '12px',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                ⚡ המערכת שלנו עושה את העבודה השחורה בשבילך
              </h3>
              <p
                style={{
                  fontSize: '18px',
                  color: 'rgba(255, 255, 255, 0.95)',
                  margin: 0,
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                כדי שתוכל להתמקד באירוח מושלם ולא בניהול מסובך
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  )
}
