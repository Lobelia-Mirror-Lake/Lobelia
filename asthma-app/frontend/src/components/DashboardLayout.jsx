import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { urls } from "../constants";
import { useAuth } from "../context/AuthContext";
import ProfileCircle from "./input/ProfileCircle";
import FormModal from "./input/FormModal";

function DashboardLayout() {
  const location = useLocation();
  const { user, logout, refreshUserProfile } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    refreshUserProfile();
  }, []);

  const pageNames = {
    [urls.home]: `Hi, ${user?.name || "User"}!`,
    [urls.statistics]: "Your Statistics",
    [urls.calendar]: "Calendar",
    [urls.profile]: "Profile",
  };

  const currentPage = pageNames[location.pathname];

  function openLogoutModal() {
    setShowLogoutModal(true);
  }

  function closeLogoutModal() {
    setShowLogoutModal(false);
  }

  function confirmLogout() {
    logout();
    setShowLogoutModal(false);
  }

  return (
    <>
      {/* Navbar */}
      <div
        className="dashboard-navbar"
        style={{ backgroundColor: "var(--color-tertiary-dark)" }}
      >
        <Navbar expand="md">
          <Navbar.Toggle aria-controls="dashboard-navbar-nav" />

          <Navbar.Collapse id="dashboard-navbar-nav">
            <Nav className="w-100">
              <Nav.Link as={NavLink} to={urls.home} end>
                Home
              </Nav.Link>

              <Nav.Link as={NavLink} to={urls.statistics}>
                Statistics
              </Nav.Link>

              <Nav.Link as={NavLink} to={urls.calendar}>
                Calendar
              </Nav.Link>

              <Nav.Link as={NavLink} to={urls.profile}>
                Profile
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
      </div>

      {/* Spacer */}
      <div style={{ height: "96px" }} />

      {/* Header */}
      <div className="p-4">
        <div
          className="horizontal at-middle-center"
          style={{ justifyContent: "space-between" }}
        >
          <h1>{currentPage}</h1>

          <ProfileCircle
            imageUrl={user?.profile_picture}
            onClick={openLogoutModal}
          />
        </div>

        <hr />
      </div>

      {/* Content */}
      <Container fluid className="w-100 p-0">
        <Outlet />
      </Container>

      {/* Logout Confirmation */}
      {
        showLogoutModal && (
          <FormModal
            title="Logout?"
            onHide={closeLogoutModal}
            onSubmit={confirmLogout}
            submitText="Logout"
          >
            <div className="at-middle-center vertical-16">
              <p className="text-center">
                Are you sure you want to log out?
              </p>
            </div>
          </FormModal>
        )
      }
    </>
  );
}

export default DashboardLayout;