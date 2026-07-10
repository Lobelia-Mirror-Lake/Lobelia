import CheckboxList from "../../input/CheckboxList";
import { asthmaSymptoms } from "../../../lib/constants";

export function SymptomsStep({
    formData,
    setFormData
}) {

    const setSymptoms = (symptoms) => {
        setFormData(prev => ({
            ...prev,
            symptoms
        }));
    };

    return(
        <div className="vertical-24 at-top-center w-100">

            <p className="section-text">
                Which asthma symptoms do you experience?
            </p>

            <CheckboxList
                options={asthmaSymptoms}
                selected={formData.symptoms}
                setSelected={setSymptoms}
            />

        </div>
    );
}

export default SymptomsStep;