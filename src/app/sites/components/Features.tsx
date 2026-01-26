'use client'

import { Icon } from '@iconify/react'
import { Col, Container, Row } from 'react-bootstrap'

interface FeaturesProps {
  content: {
    title?: string
    description?: string
    items?: Array<{ icon: string; title: string }>
  }
}

const Features = ({ content }: FeaturesProps) => {
  const features = content.items || [
    { icon: 'mdi:bed-double', title: '2 חדרי שינה' },
    { icon: 'mdi:map-marker', title: 'מיקום נוח במרכז' },
    { icon: 'mdi:door-open', title: 'כניסה נפרדת ופרטיות' },
    { icon: 'mdi:image-filter-hdr', title: 'מרפסת נוף ענקית' },
    { icon: 'mdi:kitchen', title: 'מטבח מאובזר' },
    { icon: 'mdi:sofa', title: 'חלל משותף נוח' },
  ]

  const handleBookNow = () => {
    const floatingButton = document.querySelector('.floating-availability-button') as HTMLElement
    if (floatingButton) {
      floatingButton.click()
    }
  }

  return (
    <section
      style={{
        background: '#ffffff',
        padding: '40px 0',
        position: 'relative',
        direction: 'rtl',
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            <h1
              style={{
                fontSize: '42px',
                fontWeight: 'bold',
                color: '#1a365d',
                marginBottom: '25px',
                lineHeight: '1.2',
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                fontFamily: 'Rubik, sans-serif',
              }}
            >
              {content.title || 'בין פלגי הדן אל מול נופי חרמון היחידה שלנו מציעה לכם חוויה מושלמת'}
            </h1>
            <p
              style={{
                fontSize: '18px',
                color: '#666',
                lineHeight: '1.8',
                marginBottom: '40px',
                textAlign: 'center',
                fontFamily: 'Rubik, sans-serif',
              }}
            >
              {content.description || ''}
            </p>
          </Col>
        </Row>

        <Row className="g-4 justify-content-center" style={{ marginTop: '30px' }}>
          {features.map((feature, idx) => (
            <Col key={idx} xs={6} md={4} lg={2}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)'
                  e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Icon
                  icon={feature.icon}
                  style={{
                    fontSize: '48px',
                    color: '#0d9488',
                    marginBottom: '15px',
                  }}
                />
                <h6
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#2d3748',
                    margin: 0,
                    fontFamily: 'Rubik, sans-serif',
                  }}
                >
                  {feature.title}
                </h6>
              </div>
            </Col>
          ))}
        </Row>

        <Row className="justify-content-center" style={{ marginTop: '50px' }}>
          <Col xs={12} md={6} lg={4} className="text-center">
            <button
              onClick={handleBookNow}
              style={{
                padding: '15px 40px',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                fontFamily: 'Rubik, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
              }}
            >
              📅 בדיקת זמינות והזמנה
            </button>
          </Col>
        </Row>
      </Container>
    </section>
  )
}

export default Features
