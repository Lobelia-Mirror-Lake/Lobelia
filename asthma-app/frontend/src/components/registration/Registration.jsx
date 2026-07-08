import { Container, Row, Col, Button } from 'react-bootstrap';
import ArrowButton from '../input/ArrowButton';
import SegmentedProgressBar from '../input/SegmentedProgressBar';

export function Registration({
  numPage = 0,
  numPages = 7,
  onNext,
  onBack,
  children
}) {
    var headerEle = <></>

    // first page
    if (numPage == 0) {
        headerEle = <h1>Welcome!</h1>;
    }
    // last page
    else if (numPage == numPages - 1) {
        headerEle = <h1>Thank You!</h1>;
    }
    // middle page
    else {
        headerEle = <SegmentedProgressBar numPage={numPage-1} numPages={numPages-2} />;
    }

    return (
        <Container
            fluid
            className="vertical p-5 min-vh-100 text-center"
        >
            <Row className="flex-grow-1">
                <Col className="vertical-8 p-0">
                    { headerEle }
                    <hr />
                    { children }
                    <div className="horizontal-48 at-bottom-center mt-auto">
                        {
                            numPage != 0 && <ArrowButton
                                className="button-dark btn-arrow"
                                isBack={true}
                                onClick={onBack}
                            ></ArrowButton>
                        }
                        {
                            numPage != numPages - 1 && <ArrowButton
                                className="button-dark btn-arrow"
                                isBack={false}
                                onClick={onNext}
                            ></ArrowButton>
                        }
                    </div>
                </Col>
            </Row>
        </ Container>
    )
}

export default Registration;