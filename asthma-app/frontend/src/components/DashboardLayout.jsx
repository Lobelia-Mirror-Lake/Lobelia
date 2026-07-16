import { Outlet } from 'react-router';
import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import BrandMark from './BrandMark';

function DashboardLayout() {
  return (
    <>
      <Navbar>
        {/* your nav content */}
      </Navbar>

      <Container fluid="xl" className="app-content py-4 py-lg-5">
        <Outlet /> {/* this renders HomePage, StatisticsPage, etc. */}
      </Container>
    </>
  );
}

export default DashboardLayout;