'use client'

import GlightBox from '@/components/GlightBox'
import Image from 'next/image'
import { useEffect, useMemo } from 'react'
import { Col, Container, Row } from 'react-bootstrap'

interface PortfolioProps {
  content: {
    categories?: Array<{ id: string; name: string }>
  }
  images: Array<{ id: string; public_url: string; order_index: number }>
}

const Portfolio = ({ content, images }: PortfolioProps) => {
  const categories = content.categories || [
    { id: 'living_room', name: 'חלל משותף' },
    { id: 'master_bedroom', name: 'יחידת הורים' },
    { id: 'porch', name: 'המרפסת שלנו' },
    { id: 'extra_room', name: 'חדר נוסף' },
  ]

  const portfolioItems = images.map((img, idx) => ({
    image: img.public_url,
    category: categories[idx % categories.length]?.id || 'all',
    categoryName: categories[idx % categories.length]?.name || 'הכל',
    title: `תמונה ${idx + 1}`,
  }))

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/helpers/init-isotope').then(({ initIsotope }) => {
        initIsotope()
      })
    }
  }, [])

  return (
    <>
      <section id="portfolio-gallery" className="section">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="text-center">
                <ul className="col container-filter portfolioFilte list-unstyled mb-0 grid-menu" data-target=".portfolioContainer" id="filter">
                  <li>
                    <a className="categories active" data-filter="*">
                      הכל
                    </a>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <a className="categories" data-filter={`.${cat.id}`}>
                        {cat.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Col>
          </Row>
        </Container>

        <Container fluid className="mt-4">
          <Row className="portfolioContainer">
            {portfolioItems.map((item, idx) => {
              const galleryItem = {
                href: item.image,
                title: item.title,
              }
              return (
                <Col className={`${item.category} col-6 col-md-4 col-lg-3 picture-item p-2`} data-aos="fade-up" key={idx}>
                  <div className="portfolio-box">
                    <GlightBox className="glightbox" data-gallery="portfolio" href={galleryItem.href} title={galleryItem.title}>
                      <div className="portfolio-img position-relative">
                        <Image 
                          src={item.image} 
                          alt={item.title}
                          width={400}
                          height={300}
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                      <div className="portfolio-overlay">
                        <div className="portfolio-title">
                          <div className="categories">{item.categoryName}</div>
                        </div>
                      </div>
                    </GlightBox>
                  </div>
                </Col>
              )
            })}
          </Row>
        </Container>
      </section>
    </>
  )
}

export default Portfolio
