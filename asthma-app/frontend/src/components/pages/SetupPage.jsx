import { useState } from "react";
import Registration from "../registration/Registration";
import WelcomeStep from "../registration/steps/WelcomeStep";
import ProfileStep from "../registration/steps/ProfileStep";
import EmergencyContactsStep from "../registration/steps/EmergencyContactsStep";
import TriggersStep from "../registration/steps/TriggersStep";
import SymptomsStep from "../registration/steps/SymptomsStep";
import TrackingStep from "../registration/steps/TrackingStep";
import FinishStep from "../registration/steps/FinishStep";

function SetupPage() {
    const numPages = 7;
    const [numPage, setNumPage] = useState(0);

    const [setupData, setSetupData] = useState({
        username: "",
        password: "",
        name: "",
        age: "",
    });

    const nextPage = () => {
        if (numPage < numPages - 1) {
        setNumPage(numPage + 1);
        }
    };

    const prevPage = () => {
        if (numPage > 0) {
        setNumPage(numPage - 1);
        }
    };

    const pages = [
        <WelcomeStep />,
        <ProfileStep />,
        <EmergencyContactsStep />,
        <TriggersStep />,
        <SymptomsStep />,
        <TrackingStep />,
        <FinishStep data={setupData} />,
    ];

    return (
        <Registration
        numPage={numPage}
        numPages={numPages}
        onNext={nextPage}
        onBack={prevPage}
        >
        {pages[numPage]}
        </Registration>
    );
}

export default SetupPage;