export function validate(fields, data, setErrors, setInputError) {
    const newErrors = {};

    fields.forEach(field => {
        newErrors[field.name] = field.error(
            data[field.name],
            data
        );
    });

    setErrors(newErrors);

    // reset input error field, as fields are being updated
    setInputError("");
}