import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import FormFull from '../input/FormFull';
import ArrowButton from '../input/ArrowButton';
import { loginFields, signUpFields, loginState, signUpState } from '../../lib/constants';
import { login, signUp, isJwt } from '../../helper-functions/authentication';
import { useAuth } from '../../context/AuthContext';
import playErrorResponse from '../../helper-functions/playErrorResponse';
import { validate } from '../../helper-functions/validate';

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
  const { storeToken } = useAuth();

  // button error handling
  const [buttonError, setButtonError] = useState("");
  const [shake, setShake] = useState(false);

  // validate errors immediately
  useEffect(() => {
    validate(fields, formData, setErrors, setButtonError);
  }, [])

  // ********************* login or sign up is clicked *****************************
  async function authButtonClick() {
    // ensure there are no error messages
    if (Object.values(errors).some(error => error)) {
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

    console.log("hi");

    // valid token: store it and navigate to next page
    if ( isJwt(result) ) {
      storeToken(result);
    }
    // invalid token: update errors
    else {
      playErrorResponse();
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