import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap'
import { NavLink, Outlet } from 'react-router'
import BrandMark from './BrandMark'
import { useMirrorLakeApp } from '../context/MirrorLakeAppContext'

function DashboardLayout() {
  const { activeUser, logout, pages } = useMirrorLakeApp()

  return (
    <>
      <Navbar expand="lg" className="app-navbar" sticky="top" aria-label="Primary navigation">
        <Container fluid="xl">
          <Navbar.Brand as={NavLink} to="/home" className="brand-link">
            <BrandMark />
            <span>
              <strong>Mirror Lake</strong>
              <small>Asthma tracker</small>
            </span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navigation" />
          <Navbar.Collapse id="main-navigation">
            <Nav className="me-auto align-items-lg-center gap-lg-2">
              {pages.map((item) => (
                <Nav.Link key={item.key} as={NavLink} to={item.path}>
                  {item.label}
                </Nav.Link>
              ))}
              <NavDropdown title="Pages" id="pages-dropdown">
                {pages.map((item) => (
                  <NavDropdown.Item key={item.key} as={NavLink} to={item.path}>
                    {item.label}
                  </NavDropdown.Item>
                ))}
              </NavDropdown>
            </Nav>
            <div className="nav-actions">
              <span className="nav-user">{activeUser.name}</span>
              <button type="button" className="btn btn-outline-success logout-button" onClick={logout}>
                Logout
              </button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid="xl" className="app-content py-4 py-lg-5">
        <Outlet />
      </Container>
    </>
  )
}

export default DashboardLayout