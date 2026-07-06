import { Container, Row, Col, Button, Form } from 'react-bootstrap'
import FormFull from '../input/FormFull'
import BackButton from '../input/BackButton';

function AuthSlide({ showLogin, showSignUp, onBack, landingVisible }) {
  // must have only one be true
  if ((showLogin && showSignUp) || (!showLogin && !showSignUp)) {
    return <h1>Error in loading.</h1>
  }

  // form info
  const signUp_Labels = ["Username", "Password", "Confirm Password"];
  const signUp_Placeholders = ["Enter your username", "Enter your password", "Re-enter your password"];
  
  const login_Labels = ["Username", "Password"];
  const login_Placeholders = ["Enter your username", "Enter your password"];

  return (
    <Container
        fluid
        className="dark-green-body p-5 vertical-48 min-vh-100 position-relative"
    >
      {
        // back button will be placed in top-left corner absolutely (without affecting placement of other items)
        !landingVisible && <BackButton className="button-dark p-2 absolute-top-left" onClick={onBack} />
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
              !showLogin && <FormFull labels={signUp_Labels} placeholders={signUp_Placeholders}/>
            }
            {
              showLogin && <FormFull labels={login_Labels} placeholders={login_Placeholders}/>
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