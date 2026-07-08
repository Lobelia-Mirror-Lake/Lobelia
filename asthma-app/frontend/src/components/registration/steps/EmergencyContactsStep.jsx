import { useState } from "react";
import { Button } from "react-bootstrap";
import ContactModal from "../ContactModal";
import ContactCard from "../ContactCard";

function EmergencyContactsStep({
    formData,
    setFormData
}) {
    const [showModal, setShowModal] = useState(false);

    const contacts = formData.emergencyContacts ?? [];


    const addContact = (contact) => {
        setFormData({
            ...formData,
            emergencyContacts: [
                ...formData.emergencyContacts,
                contact
            ]
        });

        setShowModal(false);
    };


    const removeContact = (id) => {
    setFormData({
        ...formData,
        emergencyContacts:
        contacts.filter(contact => contact.id !== id)
    });
    };


    return (
        <div className="vertical-32">
            <p>Who are your Emergency Contacts?</p>


            <div className="vertical-16">
            {
                contacts.map(contact => (
                <ContactCard
                    key={contact.id}
                    contact={contact}
                    onDelete={() =>
                    removeContact(contact.id)
                    }
                />
                ))
            }
            </div>


            <Button
            className="button-dark btn-medium-text"
            onClick={() => setShowModal(true)}
            >
            Add Contact
            </Button>


            <ContactModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onSubmit={addContact}
            />
        </div>
    );
}

export default EmergencyContactsStep;