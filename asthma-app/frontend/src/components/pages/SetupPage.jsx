import { useState } from "react";
import Registration from "../registration/Registration";
import WelcomeStep from "../registration/steps/WelcomeStep";
import ProfileStep from "../registration/steps/ProfileStep";
import EmergencyContactsStep from "../registration/steps/EmergencyContactsStep";
import TriggersStep from "../registration/steps/TriggersStep";
import SymptomsStep from "../registration/steps/SymptomsStep";
import TrackingStep from "../registration/steps/TrackingStep";
import FinishStep from "../registration/steps/FinishStep";
import { profileState } from "../../lib/constants";
import playErrorResponse from "../../helper-functions/playErrorResponse";

function SetupPage() {
    const numPages = 7;
    const [numPage, setNumPage] = useState(0);

    const [setupData, setSetupData] = useState({
        ...profileState,
        // add other pages here
        emergencyContacts: [],
        triggers: [],
        symptoms: [],
        tracking: {},
    });

    // error handling
    const [errors, setErrors] = useState({});
    const [buttonError, setButtonError] = useState("");
    const [shake, setShake] = useState(false);

    const nextPage = () => {
        if (!canContinue) {
            setButtonError("Please complete all required fields.");
            playErrorResponse(setShake);
            return;
        }        
        if (numPage < numPages - 1) {
            setNumPage(numPage + 1);

            // reset errors
            setErrors({});
            setButtonError("");
        }
    };

    const prevPage = () => {
        if (numPage > 0) {
            setNumPage(numPage - 1);
            
            // reset errors
            setErrors({});
            setButtonError("");
        }
    };

    const pages = [
        <WelcomeStep />,
        <ProfileStep
            formData={setupData}
            setFormData={setSetupData}
            errors={errors}
            setErrors={setErrors}
            setButtonError={setButtonError}
        />,
        <EmergencyContactsStep
            formData={setupData}
            setFormData={setSetupData}
            errors={errors}
            setErrors={setErrors}
            setButtonError={setButtonError}
        />,
        <TriggersStep
            formData={setupData}
            setFormData={setSetupData}
            errors={errors}
            setErrors={setErrors}
            setButtonError={setButtonError}
        />,
        <SymptomsStep
            formData={setupData}
            setFormData={setSetupData}
            errors={errors}
            setErrors={setErrors}
            setButtonError={setButtonError}
        />,
        <TrackingStep
            formData={setupData}
            setFormData={setSetupData}
            errors={errors}
            setErrors={setErrors}
            setButtonError={setButtonError}
        />,
        <FinishStep data={setupData}
            formData={setupData}
            setFormData={setSetupData}
            errors={errors}
            setErrors={setErrors}
            setButtonError={setButtonError}
        />,
    ];

    const canContinue = Object.values(errors).every(error => !error);

    return (
        <Registration
            numPage={numPage}
            numPages={numPages}
            onNext={nextPage}
            onBack={prevPage}
            nextDisabled={!canContinue}
            buttonError={buttonError}
            shake={shake}
        >
            {pages[numPage]}
        </Registration>
    );
}

export default SetupPage;