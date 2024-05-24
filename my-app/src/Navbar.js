import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css'; // For Bootstrap icons

const NavigationBar = () => {
  const { isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    navigate('/');
  };

  const handleProtectedLinkClick = (path) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate('/login');
    }
  };

  const userEmail = auth.currentUser ? auth.currentUser.email : '';

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/">Your Logo</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Inicio</Nav.Link>
            <Nav.Link as={Link} to="/find-work">Encontrar Trabajo</Nav.Link>
            <Nav.Link as={Link} to="/services">Encontrar servicio</Nav.Link>
            <Nav.Link onClick={() => handleProtectedLinkClick('/post-job')}>Publicar Empleo</Nav.Link>
            <Nav.Link onClick={() => handleProtectedLinkClick('/post-service')}>Publicar Servicio</Nav.Link>
          </Nav>
          <Nav>
            {isAuthenticated ? (
              <NavDropdown title={<i className="bi bi-person-circle">{userEmail}</i>} id="basic-nav-dropdown">
                <NavDropdown.Item as={Link} to="/UserProfile">Perfil</NavDropdown.Item>
                <NavDropdown.Item onClick={handleLogout}>Cerrar sesión</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">Iniciar Sesión</Nav.Link>
                <Nav.Link as={Link} to="/register">Registrarse</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;