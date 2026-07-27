import { Button, Container, Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";
import { useRef, useLayoutEffect, useState } from "react";

function LandingContent({
  onLogin,
  onSignUp,
  onBack,
  authSlideOpen,
  buttonsDisabled,
  animationDuration
}) {

  const loginSignupRef = useRef(null);
  const backRef = useRef(null);

  const [loginSignupHeight, setLoginSignupHeight] = useState(0);
  const [backHeight, setBackHeight] = useState(0);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      if (loginSignupRef.current) {
        setLoginSignupHeight(
          loginSignupRef.current.offsetHeight
        );
      }

      if (backRef.current) {
        setBackHeight(
          backRef.current.offsetHeight
        );
      }
    });

    if (loginSignupRef.current)
      observer.observe(loginSignupRef.current);

    if (backRef.current)
      observer.observe(backRef.current);

    return () => observer.disconnect();

  }, []);

  const wrapperHeight =
    authSlideOpen
      ? backHeight
      : loginSignupHeight;


  return (
    <Container
      fluid
      className="green-body vertical min-vh-100 h-100"
      style={{
        justifyContent: "space-between"
      }}
    >

      <Row className="at-middle-center text-center">
        <Col xs="auto">
          <h1 className="title">
            Lobelia
          </h1>
          <h2 className="section-text">
            AI-Powered Asthma Risk Forecasting
          </h2>
        </Col>
      </Row>

      <motion.div
        animate={{
          height: wrapperHeight
        }}
        transition={{
          duration: animationDuration
        }}
        style={{
          position: "relative",
          overflow: "hidden"
        }}
      >

        {/* Login / Signup */}
        <motion.div
          ref={loginSignupRef}
          animate={{
            opacity: authSlideOpen ? 0 : 1,
            pointerEvents: authSlideOpen
              ? "none"
              : "auto",
          }}
          transition={{
            duration: animationDuration
          }}
          style={{
            position: "absolute",
            width: "100%",
            padding: "8px"
          }}
        >
          <Row className="at-middle-center g-3">
            <Col xs="auto">
              <Button
                className="button-dark btn-large-text"
                onClick={onLogin}
                disabled={buttonsDisabled}
              >
                Login
              </Button>
            </Col>
            <Col xs="auto line-break-wrapper">
              <span className="btn-large-text line-break">
                Or
              </span>
            </Col>
            <Col xs="auto">
              <Button
                className="button-dark btn-large-text"
                onClick={onSignUp}
                disabled={buttonsDisabled}
              >
                Sign Up
              </Button>
            </Col>
          </Row>
        </motion.div>

        {/* Back */}
        <motion.div
          ref={backRef}
          animate={{
            opacity: authSlideOpen ? 1 : 0,
            pointerEvents: authSlideOpen
              ? "auto"
              : "none",
          }}
          transition={{
            duration: animationDuration
          }}
          style={{
            position: "absolute",
            width: "100%"
          }}
        >
          <Row className="at-middle-center g-3">
            <Col xs="auto">
              <Button
                className="button-dark btn-large-text"
                onClick={onBack}
                disabled={buttonsDisabled}
              >
                Back
              </Button>
            </Col>
          </Row>
        </motion.div>

      </motion.div>
    </Container>
  );
}

export default LandingContent;