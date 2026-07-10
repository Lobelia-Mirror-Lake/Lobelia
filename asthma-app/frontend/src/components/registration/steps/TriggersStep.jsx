import CheckboxList from "../../input/CheckboxList";
import { asthmaTriggers } from "../../../lib/constants";

export function TriggersStep({
    formData,
    setFormData
}) {

    const setTriggers = (triggers) => {
        setFormData(prev => ({
            ...prev,
            triggers
        }));
    };

    return(
        <div className="vertical-24 at-top-center w-100">

            <p className="section-text">
                Which asthma triggers do you have?
            </p>

            <CheckboxList
                options={asthmaTriggers}
                selected={formData.triggers}
                setSelected={setTriggers}
            />

        </div>
    );
}

export default TriggersStep;