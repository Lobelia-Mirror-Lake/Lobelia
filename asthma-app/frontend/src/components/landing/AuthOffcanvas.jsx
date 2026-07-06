import { Button, Form, Offcanvas } from 'react-bootstrap'

function AuthOffcanvas() {

  return (
    <Offcanvas show={authOpen} onHide={closeAuth} placement="end" className="auth-offcanvas" backdropClassName="auth-backdrop">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{authMode === 'login' ? 'Login' : 'Sign up'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
      </Offcanvas.Body>
    </Offcanvas>
  )
}

export default AuthOffcanvas