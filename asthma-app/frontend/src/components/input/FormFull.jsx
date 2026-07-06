import { Form } from 'react-bootstrap';

function FormFull( { labels, placeholders } ) {
    // labels and placeholders should hold same amount of info
    if (labels.length != placeholders.length) {
        return <h1>Error in number of labels and placeholders.</h1>
    }

    return (
        <div
            className="vertical-16 flex-fill"
            style={{ justifyContent: "space-evenly" }}
        >
        {
            labels.map((label, index) => {
                return (<Form.Group key={label} className="vertical-8 flex-fill">
                    <Form.Label>{label}</Form.Label>
                    <Form.Control
                    type="text"
                    placeholder={placeholders[index]}
                    />
                </Form.Group>);
            })
        }
        </div>  
    );
}

export default FormFull;