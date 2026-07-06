import { Container, Row, Col, Button, Form } from 'react-bootstrap'

function AuthSlide({ showLogin, showSignUp }) {
  // must have only one be true
  if ((showLogin && showSignUp) || (!showLogin && !showSignUp)) {
    return <h1>Error in loading.</h1>
  }

  return (
    <Container
        fluid
        className="dark-green-body p-5 vertical min-vh-100"
        style={{ justifyContent: "space-between" }}
    >
        <Row className="at-middle-center text-center g-0">
            <Col xs="auto flex-grow-1">
              <h1>{ showLogin ? "Login" : "Signup" }</h1>
              <hr />
              <Form.Group>
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter your username"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your password"
                />
              </Form.Group>
            </Col>
        </Row>

        <Row className="at-middle-center g-3">
          <Button className="button-light btn-large-text">{ showLogin ? "Login" : "Signup" }</Button>
        </Row>
    </Container>
  )
}

export default AuthSlide