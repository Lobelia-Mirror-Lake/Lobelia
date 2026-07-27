import { Outlet, Link } from 'react-router';
import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import BrandMark from './BrandMark';
import { urls } from "../constants";

function DashboardLayout() {
  return (
    <>
      <Navbar>
        {/* your nav content */}
        <Nav>
          <Nav.Link as={Link} to={urls.home}>Home</Nav.Link>
          <Nav.Link as={Link} to={urls.statistics}>Statistics</Nav.Link>
          <Nav.Link as={Link} to={urls.calendar}>Calendar</Nav.Link>
          <Nav.Link as={Link} to={urls.profile}>Profile</Nav.Link>
        </Nav>
      </Navbar>

      <Container fluid="xl" className="app-content py-4 py-lg-5">
        <Outlet /> {/* this renders HomePage, StatisticsPage, etc. */}
      </Container>
    </>
  );
}

export default DashboardLayout;