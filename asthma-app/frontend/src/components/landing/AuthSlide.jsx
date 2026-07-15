import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import FormFull from '../input/FormFull';
import ArrowButton from '../input/ArrowButton';
import { loginFields, signUpFields, loginState, signUpState, urls } from '../../lib/constants';
import { login, signUp, isJwt } from '../../helper-functions/authentication';
import { useAuth } from '../../context/AuthContext';
import playErrorResponse from '../../helper-functions/playErrorResponse';
import { validate, hasErrors } from '../../helper-functions/validate';
import { useNavigate } from "react-router";

function AuthSlide({ showLogin, showSignUp, onBack, landingVisible }) {
  // must have only one be true
  if ((showLogin && showSignUp) || (!showLogin && !showSignUp)) {
    return <h1>Error in loading.</h1>
  }

  // fields to use
  var fields = showLogin ? loginFields : signUpFields;

  // store user input and errors for the user input
  var initialFormData = showLogin ? loginState : signUpState;
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState(initialFormData);

  // authentication
  const { storeToken, setupComplete, setSetupComplete } = useAuth();

  // button error handling
  const [buttonError, setButtonError] = useState("");
  const [shake, setShake] = useState(false);

  // validate errors immediately
  useEffect(() => {
    verifyFields();
  }, [])

  // to navigate on button click
  const navigate = useNavigate();

  // navigate to home page when setupComplete changes to true
    useEffect(() => {
        if (setupComplete) {
            navigate(urls.home);
        }
    }, [setupComplete]);

  function verifyFields() {
    const newErrors = validate(fields, formData);

    setErrors(newErrors);
    return newErrors;
  }

  // ********************* login or sign up is clicked *****************************
  async function authButtonClick() {
    const newErrors = verifyFields();

    // ensure there are no errors
    if (hasErrors(newErrors)) {
        setButtonError("You have not met the requirements.");
        playErrorResponse(setShake);
        return;
    }
    
    var result;

    // validate with API
    if ( showLogin ) {
      result = await login(formData["email"], formData["password"]);
    }
    else {
      result = await signUp(formData["email"], formData["password"]);
    }

    // valid token: store it and navigate to next page
    if ( isJwt(result) ) {
      if (showLogin) {
        setSetupComplete(true);
      }
      else {
        navigate(urls.setup);
      }

      storeToken(result);
    }
    // invalid token: update errors
    else {
      setButtonError(result);
      playErrorResponse(setShake);
    }

  }

  return (
    <Container
        fluid
        className="dark-green-body p-5 vertical min-vh-100 position-relative"
    >
      {
        // back button will be placed in top-left corner absolutely (without affecting placement of other items)
        !landingVisible && <ArrowButton className="button-light p-2 absolute-top-left" isBack={true} onClick={onBack} />
      }
        <Row className="flex-grow-1">
          <Col
            className="vertical-8 p-0"
          >
            <div className="p-0">
              <h1 className="text-center">{ showLogin ? "Login" : "Sign Up" }</h1>
              <hr />
            </div>
            <FormFull
              theme={"light"}
              fields={fields}
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              setInputError={setButtonError}
            />
          </Col>
        </Row>
        <Row
          className="error-text-light at-middle-center"
          style={{height:48}}
        >{buttonError}</Row>
        <Row>
          <Button className={`button-light btn-large-text ${shake ? "shake" : ""}`} onClick={(e) => authButtonClick()} > { showLogin ? "Login" : "Sign Up" } </Button>
        </Row>
    </Container>
  )
}

export default AuthSlide;