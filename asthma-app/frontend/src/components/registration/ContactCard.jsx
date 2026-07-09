import { Button, Container, Row, Col } from "react-bootstrap";
import EditButton from "../input/EditButton";
import CancelButton from "../input/CancelButton";

function ContactCard({
  contact,
  onDelete
}) {

  return (
    <Container className="contact-card position-relative">
      <div className="horizontal-8 absolute-top-right" style={{top:"0.75rem", right:"0.75rem"}}>
        <EditButton
          className="button-light p-0"
          style={{ borderRadius: "8px" }}
          width="25"
          height="25"
        />
        <CancelButton
          className="button-light p-0"
          style={{ borderRadius: "8px" }}
          width="25"
          height="25"
          onClick={onDelete}
        />
      </ div>
      <Row className="vertical">
        <Col className="horizontal-16">
          <div>{contact.firstName}</div>
          <div>{contact.lastName}</div>
        </Col>
        <Col className="horizontal-16" style={{justifyContent: "space-between"}}>
          <div>{contact.phone}</div>
          <div>{contact.email}</div>
        </Col>
      </ Row>
    </ Container>
  );
}

export default ContactCard;