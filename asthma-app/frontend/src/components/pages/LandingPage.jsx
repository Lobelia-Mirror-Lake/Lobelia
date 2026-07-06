import { Button, Container, Row, Col } from "react-bootstrap";
import { useState } from "react";
import LandingContent from "../landing/LandingContent";
import AuthSlide from "../landing/AuthSlide";

function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <Container fluid className="min-vh-100 p-0">
      <Row className="g-0 min-vh-100">
      {!showSignUp && !showLogin ? (
        <Col xs={12}>
          <LandingContent
            onLogin={() => setShowLogin(true)}
            onSignUp={() => setShowSignUp(true)}
          />
        </Col>
      ) : (
        <>
          <Col lg={6} className="d-none d-lg-flex">
            <LandingContent
              onLogin={() => setShowLogin(false)}
              onSignUp={() => setShowSignUp(false)}
            />
          </Col>

          <Col xs={12} lg={6}>
            <AuthSlide showLogin={showLogin} showSignUp={showSignUp} />
          </Col>
        </>
      )}
    </Row>
    </Container>
  );
}

export default LandingPage;