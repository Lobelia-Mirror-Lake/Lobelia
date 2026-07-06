import { Button, Container, Row, Col } from "react-bootstrap";
import { useState } from "react";
import LandingContent from "../landing/LandingContent";

function LandingPage() {
  function onLogin() {

  }

  function onSignUp() {
    
  }

  return (
    <Container fluid className="min-vh-100 p-0">
      <Row className="g-0">
        <Col>
          <LandingContent onLogin={onLogin} onSignUp={onSignUp} />
        </Col>
      </Row>
    </Container>
  );
}

export default LandingPage;