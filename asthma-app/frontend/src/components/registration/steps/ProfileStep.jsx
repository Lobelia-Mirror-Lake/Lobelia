import { profileFields, profileState } from '../../../lib/constants';
import { useState, useEffect } from 'react';
import FormFull from "../../input/FormFull";
import { validate } from '../../../helper-functions/validate';

export function ProfileStep() {
    // store user input and errors for the user input
    const [formData, setFormData] = useState(profileState);
    const [errors, setErrors] = useState(profileState);
    const [buttonError, setButtonError] = useState("");

    // validate errors immediately
    useEffect(() => {
        validate(profileFields, formData, setErrors, setButtonError);
    }, [])

    return(
        <div className="text-start">
            <FormFull
              theme={"dark"}
              fields={profileFields}
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              setInputError={setButtonError}
            />
        </ div>
    );
}

export default ProfileStep;