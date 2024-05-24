import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Login from './components/login';
import Register from './components/register';
import Inicio from './Inicio';
import { AuthProvider, useAuth } from './AuthContext'; // Asegúrate de importar correctamente AuthProvider y useAuth
import PostJob from './post-job';
import PostService from './post-service';
import FindWork from './find-work';
import Footer from './Footer';
import UserProfile from './UserProfile';
import ServiceList from './ServiceList';
import ServiceDetails from './ServiceDetails';
import JobDetails from './jobDetails';
import ProtectedComponent from './ProtectedComponent'; // Importa el componente protegido
function App() {
  return (
    <Router>
      <AuthProvider> {/* AuthProvider debe envolver todos los componentes que dependen del contexto */}
        <div className="App">
          <Navbar />
          <Routes>
              <Route path="/find-work" element={<FindWork />} />
              <Route path="/post-job" element={<ProtectedElement component={PostJob} />} />
              <Route path="/post-service" element={<ProtectedElement component={PostService} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/UserProfile" element={<ProtectedElement component={UserProfile} />} />
              <Route path="/" element={<Inicio />} />
              <Route path="/services" element={<ServiceList />} />
              <Route path="/service-details/:id" element={<ServiceDetails />} />
              <Route path="/job-details/:id" element={<JobDetails />} />
          </Routes>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

// Helper component to handle protected routes
function ProtectedElement({ component: Component }) {
  const { isAuthenticated, user } = useAuth(); // Extraer 'user' del contexto de autenticación

  // Verifica que el usuario está autenticado y que 'user' no es nulo
  return isAuthenticated && user ? <Component userId={user.uid} /> : <Navigate to="/login" replace />;
}

function ProtectedElementMenor({ component: Component, ...props }) {
  const { isAuthenticated } = useAuth();

  // Verifies that the user is authenticated
  return isAuthenticated ? <Component {...props} /> : <Navigate to="/login" replace />;
}

export default App;
