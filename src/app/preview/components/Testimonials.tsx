'use client'

import { Container, Row, Col } from 'react-bootstrap'
import { Icon } from '@iconify/react'

export default function Testimonials() {
  const testimonials = [
    {
      name: 'דוד כהן',
      location: 'בעל 3 צימרים בגליל',
      image: '👨',
      quote: 'Hostly שינתה לנו את החיים! סוף סוף אנחנו יכולים לנהל את כל ההזמנות ממקום אחד. הסנכרון האוטומטי חוסך לנו שעות כל יום.',
      rating: 5,
    },
    {
      name: 'שרה לוי',
      location: 'יחידה באילת',
      image: '👩',
      quote: 'אני כבר לא מפחדת מדאבל-בוקינג! המערכת מנהלת הכל בשבילי והאורחים מקבלים את כל המידע אוטומטית בווטסאפ. פשוט מושלם.',
      rating: 5,
    },
    {
      name: 'יוסי מזרחי',
      location: 'וילה במושב',
      image: '👨‍💼',
      quote: 'הכי אהבתי את הדף הנחיתה האישי - עכשיו אני מקבל הזמנות ישירות בלי לשלם עמלות גבוהות. החיסכון משמעותי!',
      rating: 5,
    },
  ]

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
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
                מה אומרים בעלי צימרים שכבר עובדים איתנו?
              </h2>
              <p
                style={{
                  fontSize: '18px',
                  color: '#64748b',
                  lineHeight: '1.8',
                  fontFamily: 'Heebo, Assistant, sans-serif',
                }}
              >
                הצטרפו למאות בעלי נכסים מרוצים שכבר משתמשים במערכת
              </p>
            </div>
          </Col>
        </Row>

        <Row className="g-4">
          {testimonials.map((testimonial, idx) => (
            <Col key={idx} xs={12} lg={4}>
              <div
                style={{
                  background: 'white',
                  padding: '40px 32px',
                  borderRadius: '20px',
                  border: '2px solid #e2e8f0',
                  height: '100%',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)'
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.15)'
                  e.currentTarget.style.borderColor = '#667eea'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.06)'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                {/* Quote Icon */}
                <div
                  style={{
                    position: 'absolute',
                    top: '24px',
                    left: '24px',
                    opacity: 0.1,
                  }}
                >
                  <Icon icon="mdi:format-quote-close" style={{ fontSize: '64px', color: '#667eea' }} />
                </div>

                {/* Rating */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', justifyContent: 'center' }}>
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <span key={i} style={{ fontSize: '20px' }}>⭐</span>
                  ))}
                </div>

                {/* Quote */}
                <p
                  style={{
                    fontSize: '16px',
                    color: '#475569',
                    lineHeight: '1.7',
                    marginBottom: '24px',
                    fontStyle: 'italic',
                    fontFamily: 'Heebo, Assistant, sans-serif',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      flexShrink: 0,
                    }}
                  >
                    {testimonial.image}
                  </div>
                  <div>
                    <h4
                      style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1e293b',
                        margin: 0,
                        marginBottom: '4px',
                        fontFamily: 'Heebo, Assistant, sans-serif',
                      }}
                    >
                      {testimonial.name}
                    </h4>
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#64748b',
                        margin: 0,
                        fontFamily: 'Heebo, Assistant, sans-serif',
                      }}
                    >
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Trust Badge */}
        <Row className="mt-5">
          <Col lg={8} className="mx-auto">
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                padding: '32px',
                borderRadius: '16px',
                textAlign: 'center',
                border: '2px solid #667eea30',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon icon="mdi:check-decagram" style={{ fontSize: '32px', color: '#4caf50' }} />
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', fontFamily: 'Heebo, Assistant, sans-serif' }}>
                    מאות לקוחות מרוצים
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon icon="mdi:shield-check" style={{ fontSize: '32px', color: '#667eea' }} />
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', fontFamily: 'Heebo, Assistant, sans-serif' }}>
                    תמיכה מלאה בעברית
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon icon="mdi:update" style={{ fontSize: '32px', color: '#764ba2' }} />
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', fontFamily: 'Heebo, Assistant, sans-serif' }}>
                    עדכונים שוטפים
                  </span>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  )
}
