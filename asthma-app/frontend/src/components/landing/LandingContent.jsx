import { Button, Container, Row, Col } from "react-bootstrap";

function LandingContent({ onLogin, onSignUp }) {
    return (
        <Container
        fluid
        className="green-body p-5 vertical min-vh-100"
        style={{ justifyContent: "space-between" }}
        >
        <Row className="at-middle-center text-center">
            <Col xs="auto">
            <h1>Lobelia</h1>
            <h2 className="section-text">
                AI-Powered Asthma Risk Forecasting
            </h2>
            </Col>
        </Row>

        <Row className="at-middle-center g-3">
            <Col xs="auto">
                <Button className="button-dark btn-large-text" onClick={onLogin}>
                    Login
                </Button>
            </Col>
            <Col xs="auto line-break-wrapper">
                <span className="btn-large-text line-break">Or</span>
            </Col>
            <Col xs="auto">
                <Button className="button-dark btn-large-text" onClick={onSignUp}>
                    Sign Up
                </Button>
            </Col>
        </Row>
        </Container>
    );
}

export default LandingContent;