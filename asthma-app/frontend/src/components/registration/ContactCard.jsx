import { Button } from "react-bootstrap";

function ContactCard({
  contact,
  onDelete
}) {

  return (
    <div className="contact-card">

      <div>
        <div>
          {contact.firstName} {contact.lastName}
        </div>

        <div>
          {contact.phone}
        </div>

        <div>
          {contact.email}
        </div>
      </div>


      <Button>
        ✎
      </Button>

      <Button onClick={onDelete}>
        ×
      </Button>

    </div>
  );
}

export default ContactCard;