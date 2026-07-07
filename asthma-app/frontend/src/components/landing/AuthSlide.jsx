import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import FormFull from '../input/FormFull';
import BackButton from '../input/BackButton';
import { loginFields, signUpFields, loginState, signUpState } from '../../lib/constants';

function AuthSlide({ showLogin, showSignUp, onBack, landingVisible }) {
  // must have only one be true
  if ((showLogin && showSignUp) || (!showLogin && !showSignUp)) {
    return <h1>Error in loading.</h1>
  }

  const [formData, setFormData] = showLogin ? useState(loginState) : useState(signUpState);
  const [errors, setErrors] = showLogin ? useState(loginState) : useState(signUpState);

  return (
    <Container
        fluid
        className="dark-green-body p-5 vertical-48 min-vh-100 position-relative"
    >
      {
        // back button will be placed in top-left corner absolutely (without affecting placement of other items)
        !landingVisible && <BackButton className="button-light p-2 absolute-top-left" onClick={onBack} />
      }
        <Row className="flex-grow-1">
          <Col
            className="vertical-8 p-0"
          >
            <div className="p-0">
              <h1 className="text-center">{ showLogin ? "Login" : "Sign Up" }</h1>
              <hr />
            </div>
            {
              !showLogin && <FormFull theme={"light"} fields={signUpFields} formData={formData} setFormData={setFormData} errors={errors} setErrors={setErrors} />
            }
            {
              showLogin && <FormFull theme={"light"} fields={loginFields} formData={formData} setFormData={setFormData} errors={errors} setErrors={setErrors} />
            }
          </Col>
        </Row>

        <Row>
          <Button className="button-light btn-large-text">{ showLogin ? "Login" : "Sign Up" }</Button>
        </Row>
    </Container>
  )
}

export default AuthSlide;