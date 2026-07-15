import { Button, Container, Row, Col } from "react-bootstrap";
import { useState, useEffect } from "react";
import LandingContent from "../landing/LandingContent";
import AuthSlide from "../landing/AuthSlide";
import useMediaQuery from "../../helper-functions/useMediaQuery";
import { BREAKPOINTS, urls } from "../../lib/constants";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

function LandingPage() {
  const { user, token } = useAuth();

  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const onLogin = () => setShowLogin(true);
  const onSignUp = () => setShowSignUp(true);
  const onBack = () => {
    setShowLogin(false);
    setShowSignUp(false);
  }

  const navigate = useNavigate();

  // if logged in, redirect to dashboard
  useEffect(() => {
    if (user && token && !showSignUp && !showLogin) {
      navigate(urls.home, { replace: true });
    }
  }, [user, token, showSignUp, showLogin]);

  // get lg breakpoint
  const isLargeScreen = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);

  return (
    <Container fluid className="min-vh-100 p-0">
      <Row className="g-0 min-vh-100">
      {!showSignUp && !showLogin ? (
        <Col xs={12}>
          <LandingContent
            onLogin={onLogin}
            onSignUp={onSignUp}
            onBack={onBack}
            authSlideOpen={false}
          />
        </Col>
      ) : (
        <>
          <Col lg={6} className="d-none d-lg-flex">
            <LandingContent
              onLogin={onLogin}
              onSignUp={onSignUp}
              onBack={onBack}
              authSlideOpen={true}
            />
          </Col>

          <Col xs={12} lg={6}>
            <AuthSlide
              showLogin={showLogin}
              showSignUp={showSignUp}
              onBack={onBack}
              landingVisible={isLargeScreen}
            />
          </Col>
        </>
      )}
    </Row>
    </Container>
  );
}

export default LandingPage;