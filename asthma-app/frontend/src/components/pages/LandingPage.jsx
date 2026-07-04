import { Badge, Button, Card } from 'react-bootstrap'

function LandingPage({ onLogin, onSignUp }) {
  return (
    <div
      className="vertical at-top-center p-5 green-body"
      style={{ minHeight: "100vh", justifyContent: "space-between" }}
    >
      <div className="vertical at-top-center">
        <h1>Lobelia</h1>
        <h2 className="section-text">AI-Powered Asthma Risk Forecasting</h2>
      </div>

      <div className="horizontal-48 at-middle-center mt-3">
        <Button className="button-dark btn-large-text" onClick={onLogin}>Login</Button>
        <p className="btn-large-text">OR</p>
        <Button className="button-dark btn-large-text" onClick={onSignUp}>Sign Up</Button>
      </div>
    </div>
  )
}

export default LandingPage