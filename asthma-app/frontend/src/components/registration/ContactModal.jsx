import { useState, useEffect } from "react";
import FormModal from "../input/FormModal";
import FormFull from "../input/FormFull";
import { contactFields, contactState } from "../../lib/constants";
import { validate } from "../../helper-functions/validate";
import playErrorResponse from "../../helper-functions/playErrorResponse";


function ContactModal({ show, onHide, onSubmit }) {

    const [formData, setFormData] = useState(contactState);
    const [errors, setErrors] = useState(contactState);

    const [buttonError, setButtonError] = useState("");
    const [shake, setShake] = useState(false);


    useEffect(() => {
        validate(
            contactFields,
            formData,
            setErrors,
            setButtonError
        );
    }, []);


    function submit() {

        if (Object.values(errors).some(error => error)) {
            setButtonError(
                "You have not met the requirements."
            );

            playErrorResponse(setShake);
            return;
        }


        onSubmit({
            ...formData,
            id: crypto.randomUUID()
        });


        // clear form on successful submit
        setFormData(contactState);
        setErrors(contactState);
        onHide();
    }

    if (!show) return null;

    return (
        <FormModal
            title="Add Contact"
            onHide={onHide}
            onSubmit={submit}
            submitText="Add"
            buttonError={buttonError}
            shake={shake}
        >
            <FormFull
                theme="light"
                fields={contactFields}
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                setErrors={setErrors}
                setInputError={setButtonError}
            />
        </FormModal>
    );
}

export default ContactModal;