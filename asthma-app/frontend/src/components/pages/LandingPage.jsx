import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

import LandingContent from "../landing/LandingContent";
import AuthSlide from "../landing/AuthSlide";

import useMediaQuery from "../../helper-functions/useMediaQuery";
import { BREAKPOINTS, urls } from "../../constants";

function LandingPage() {

  const ANIMATION_DURATION = 0.45;

  // Auth states
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  // Slide states
  const [authSlideOpen, setAuthSlideOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  // allows slide to reset
  const [authKey, setAuthKey] = useState(0);

  // Disable buttons while animation is running
  const [isAnimating, setIsAnimating] = useState(false);

  const isLargeScreen = useMediaQuery(
    `(min-width: ${BREAKPOINTS.lg}px)`
  );


  const onLogin = () => {
    if (isAnimating) return;

    setShowLogin(true);
    setShowSignUp(false);

    setAuthSlideOpen(true);
    setIsClosing(false);
  };

  const onSignUp = () => {
    if (isAnimating) return;

    setShowLogin(false);
    setShowSignUp(true);

    setAuthSlideOpen(true);
    setIsClosing(false);
  };

  const onBack = () => {
    if (isAnimating) return;

    setAuthKey(k => k + 1);
    setAuthSlideOpen(false);
    setIsClosing(true);
  };


  // Motion values

  const panel = useMotionValue(100);
  const total = useMotionValue(200);
  const offset = useMotionValue(0);


  const panelWidth = useTransform(
    panel,
    (v) => `${v}vw`
  );

  const totalWidth = useTransform(
    total,
    (v) => `${v}vw`
  );

  const xOffset = useTransform(
    offset,
    (v) => `${v}vw`
  );



  useEffect(() => {
    const opening =
      (showLogin || showSignUp) &&
      authSlideOpen &&
      !isClosing;

    let animation;

    if (opening) {
      setIsAnimating(true);

      animate(panel, isLargeScreen ? 50 : 100, {
        duration: ANIMATION_DURATION,
      });

      animate(total, isLargeScreen ? 100 : 200, {
        duration: ANIMATION_DURATION,
      });

      animation = animate(
        offset,
        isLargeScreen ? 0 : -100,
        {
          duration: ANIMATION_DURATION,
        }
      );

    }

    if (isClosing) {
      setIsAnimating(true);

      animate(panel, 100, {
        duration: ANIMATION_DURATION,
      });

      animate(total, 200, {
        duration: ANIMATION_DURATION,
      });

      animation = animate(
        offset,
        0,
        {
          duration: ANIMATION_DURATION,
        }
      );

    }

    if (!animation) return;

    animation.finished
      .then(() => {
        setIsAnimating(false);

        if (isClosing) {
          setIsClosing(false);
        }

      })
      .catch(() => {});

  }, [
    showLogin,
    showSignUp,
    authSlideOpen,
    isClosing,
    isLargeScreen
  ]);


  return (
    <div
      style={{
          overflowX: "hidden",
          overflowY: "auto",
          width: "100%",
          minHeight: "100dvh",
      }}
    >
      <motion.div
        className="d-flex flex-row"
        style={{
          width: totalWidth,
          minHeight: "100dvh",
          x: xOffset,
        }}
      >

        {/* Landing panel */}
        <motion.div
          style={{
            width: panelWidth,
            minHeight: "100dvh",
          }}
        >
          <LandingContent
            onLogin={onLogin}
            onSignUp={onSignUp}
            onBack={onBack}
            authSlideOpen={authSlideOpen}
            buttonsDisabled={isAnimating}
            animationDuration={ANIMATION_DURATION}
          />
        </motion.div>

        {/* Auth panel */}
        <motion.div
          style={{
            width: panelWidth,
            minHeight: "100dvh",
          }}
        >
          <AuthSlide
            key={authKey}
            showLogin={showLogin}
            showSignUp={showSignUp}
            onBack={onBack}
            landingVisible={isLargeScreen}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default LandingPage;