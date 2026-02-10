'use client'

import { Container, Row, Col } from 'react-bootstrap'
import { Icon } from '@iconify/react'

export default function FeaturesGrid() {
  const features = [
    {
      icon: 'mdi:sync-circle',
      title: 'סנכרון רב-ערוצי',
      description: 'עדכון מחירים וזמינות ב-Real-time מול Beds24, Airbnb ו-Booking. הכל מסונכרן אוטומטית – אפס טעויות.',
      color: '#667eea',
    },
    {
      icon: 'mdi:whatsapp',
      title: 'צ\'ק-אין בוואטסאפ',
      description: 'שליחת הודעות אוטומטיות ואיסוף פרטים חיוניים בקלות וביעילות. האורחים מקבלים את כל המידע שצריך בזמן.',
      color: '#25D366',
    },
    {
      icon: 'mdi:cash-multiple',
      title: 'ניהול פיננסי מקצה לקצה',
      description: 'סליקה מאובטחת והפקת חשבוניות/קבלות אוטומטית בלחיצת כפתור. חיסכון בזמן ושקט נפשי מול רשויות המס.',
      color: '#4caf50',
    },
    {
      icon: 'mdi:web',
      title: 'דף נחיתה אישי',
      description: 'קבלו אתר אישי עם לוח שנה מעודכן לקבלת הזמנות ישירות. חוסך עמלות ומגדיל רווחים!',
      color: '#764ba2',
    },
  ]

  return (
    <section
      id="features"
      style={{
        background: '#fafafa',
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
                למה המערכת שלנו היא הפתרון המושלם לכם?
              </h2>
              <p
                style={{
                  fontSize: '18px',
                  color: '#64748b',
                  lineHeight: '1.8',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                כל הכלים שאתם צריכים לניהול מקצועי ויעיל של הנכס שלכם
              </p>
            </div>
          </Col>
        </Row>

        <Row className="g-4">
          {features.map((feature, idx) => (
            <Col key={idx} xs={12} md={6}>
              <div
                style={{
                  background: 'white',
                  padding: '32px',
                  borderRadius: '20px',
                  border: `2px solid ${feature.color}33`,
                  height: '100%',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)'
                  e.currentTarget.style.boxShadow = `0 12px 32px ${feature.color}40`
                  e.currentTarget.style.borderColor = feature.color
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)'
                  e.currentTarget.style.borderColor = `${feature.color}33`
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}10)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <Icon icon={feature.icon} style={{ fontSize: '28px', color: feature.color }} />
                </div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '12px',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: '15px',
                    color: '#64748b',
                    lineHeight: '1.7',
                    margin: 0,
                    fontFamily: 'Heebo, Assistant, sans-serif',
                  }}
                >
                  {feature.description}
                </p>
              </div>
            </Col>
          ))}
        </Row>

        {/* קריאה לפעולה משנית */}
        <Row className="mt-5">
          <Col lg={8} className="mx-auto text-center">
            <div
              style={{
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
                padding: '40px',
                borderRadius: '20px',
                border: '2px solid #F993FB',
              }}
            >
              <h3
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '16px',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                💡 מוכנים לחוות את ההבדל?
              </h3>
              <p
                style={{
                  fontSize: '16px',
                  color: '#64748b',
                  marginBottom: '24px',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                התחילו עם 14 יום ניסיון חינם ותראו איך המערכת משנה את הדרך שבה אתם מנהלים את הנכס
              </p>
              <button
                style={{
                  padding: '14px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.3)'
                }}
                onClick={() => window.location.href = '/dashboard/login'}
              >
                🚀 נסו בחינם 14 יום
              </button>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  )
}
