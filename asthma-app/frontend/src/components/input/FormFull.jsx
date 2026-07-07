import { Form } from 'react-bootstrap';
import { useEffect } from 'react';
import { errorIconDataUri } from '../../helper-functions/errorIconDataUri';
import { getColor } from '../../helper-functions/getColor';

function FormFull( { fields, formData, setFormData, errors, setErrors, theme = "dark" } ) {
    // labels and placeholders should hold same amount of info
    if (fields.length != Object.keys(formData).length) {
        return <h1>Error in number of fields and data.</h1>
    }

    // test whether input meets requirements
    const handleChange = (name, value) => {
        const newData = {
            ...formData,
            [name]: value,
        };

        setFormData(newData);

        const newErrors = {};
        fields.forEach(field => {
            newErrors[field.name] = field.error(
                newData[field.name],
                newData
            );
        });

        setErrors(newErrors);
    };

    // get color and shape for error icon
    var contrast = (theme == "light") ? "dark" : "light";
    const color = getColor(`--color-error-${contrast}`);
    const icon = errorIconDataUri(color);

    // apply error icon
    useEffect(() => {
        document.querySelectorAll('.form-control').forEach(el => {
            if (el.classList.contains('is-invalid')) {
                // apply icon
                el.style.backgroundImage = icon;
                el.style.backgroundRepeat = "no-repeat";
                el.style.backgroundPosition = "right .75rem center";
                el.style.backgroundSize = "1rem";
            } else {
                // remove icon
                el.style.backgroundImage = "";
                el.style.backgroundRepeat = "";
                el.style.backgroundPosition = "";
                el.style.backgroundSize = "";
            }
        });
    }, [errors]);

    return (
        <div
            className={`form-full ${theme} vertical-16 flex-fill`}
            style={{ justifyContent: "space-evenly" }}
        >
        {
            fields.map((data, index) => {
                return (<Form.Group key={data.name} className="vertical-8 flex-fill">
                    <Form.Label>{data.label}</Form.Label>
                    <Form.Control
                        type={data.type}
                        placeholder={data.placeholder}
                        value={formData[data.name] ?? ""}
                        onChange={(e) => handleChange(data.name, e.target.value)}
                        isInvalid={ errors[data.name] }
                    />
                    <Form.Control.Feedback type="invalid">
                        { errors[data.name] }
                    </Form.Control.Feedback>
                </ Form.Group>);
            })
        }
        </div>  
    );
}

export default FormFull;