import earth from '@/assets/images/icons/earth.png'
import mobilepay from '@/assets/images/icons/mobilepay.png'
import { Icon } from '@iconify/react'
import Image from 'next/image'
import { Col, Container, Row } from 'react-bootstrap'

interface ContactProps {
  content: {
    location?: string
    phone?: string
    email?: string
  }
  metaSettings?: {
    address?: string
    phone?: string
    email?: string
  }
}

const Contact = ({ content, metaSettings }: ContactProps) => {
  const location = content.location || metaSettings?.address || 'כתובת'
  const phone = content.phone || metaSettings?.phone || 'טלפון'
  const email = content.email || metaSettings?.email || 'אימייל'

  return (
    <>
      <section className="section bg-light">
        <Container>
          <Row>
            <Col lg={4}>
              <div className="text-center mt-4">
                <div className="services-img" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon icon="mdi:map-marker" style={{ fontSize: '50px', color: '#2e2e2e' }} />
                </div>
                <h6 className="mt-4">{location}</h6>
              </div>
            </Col>
            <Col lg={4}>
              <div className="text-center mt-4">
                <div className="services-img">
                  <Image width={50} height={50} className="img-fluid" src={mobilepay} alt="" />
                </div>
                <h6 className="mt-4">{phone}</h6>
              </div>
            </Col>
            <Col lg={4}>
              <div className="text-center mt-4">
                <div className="services-img">
                  <Image width={50} height={50} className="img-fluid" src={earth} alt="" />
                </div>
                <h6 className="mt-4">{email}</h6>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  )
}

export default Contact
