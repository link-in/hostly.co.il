import { Col, Container, Row } from 'react-bootstrap'

const Footer = () => {
  return (
    <>
      <footer className="pt-1 pb-1 bg-dark">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="pt-4 pb-4 text-center">
                <p className="text-white mb-0">{new Date().getFullYear()} © link-in. </p>
              </div>
            </Col>
          </Row>
        </Container>
      </footer>
    </>
  )
}

export default Footer
