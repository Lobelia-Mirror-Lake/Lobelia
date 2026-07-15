import { useState } from "react";
import { Button, Container, Row, Col } from "react-bootstrap";
import ContactModal from "../ContactModal";
import ContactCard from "../ContactCard";


function EmergencyContactsStep({
    formData,
    setFormData
}) {

    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);

    const contacts = formData.emergencyContacts ?? [];

    function openAddModal() {
        setEditingContact(null);
        setShowModal(true);
    }

    function openEditModal(contact) {
        setEditingContact(contact);
        setShowModal(true);
    }

    function closeModal() {
        setEditingContact(null);
        setShowModal(false);
    }

    function saveContact(contact) {
        // Add
        if (!editingContact) {
            setFormData({
                ...formData,
                emergencyContacts: [
                    ...contacts,
                    {
                        ...contact,
                        id: crypto.randomUUID()
                    }
                ]
            });
        }

        // Edit
        else {
            setFormData({
                ...formData,
                emergencyContacts: contacts.map(existing =>
                    existing.id === contact.id
                        ? contact
                        : existing
                )
            });
        }
        closeModal();
    }

    function removeContact(id) {

        setFormData({
            ...formData,
            emergencyContacts:
                contacts.filter(
                    contact => contact.id !== id
                )
        });

    }

    return (
        <div className="vertical-fill vertical-24 at-top-center">

            <p className="section-text">
                Who are your Emergency Contacts?
            </p>

            <div className="vertical-16 scrollable">
                {contacts.map(contact => (
                    <ContactCard
                        key={contact.id}
                        contact={contact}
                        onEdit={() => openEditModal(contact)}
                        onDelete={() => removeContact(contact.id)}
                    />
                ))}
            </div>

            <Button
                className="button-dark btn-medium-text text-center"
                style={{ width: "clamp(200px, 40vw, 400px)" }}
                onClick={openAddModal}
            >
                Add Contact
            </Button>

            <ContactModal
                show={showModal}
                onHide={closeModal}
                onSubmit={saveContact}
                initialData={editingContact}
            />
        </div>
    );
}

export default EmergencyContactsStep;