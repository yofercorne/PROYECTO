import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import appfirebase from '../credenciales';

const Register = () => {
  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth(appfirebase);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleRegistration = async (email, password) => {
    try {
      // Guardar el usuario en la base de datos local y enviar correo de verificación
      const response = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Failed to register user in local DB');
      }

      const data = await response.json();
      console.log('User registered and verification email sent:', data);
      
      // Navegar a la página de verificación de correo
      navigate('/verify-email', { state: { email, password } });
    } catch (error) {
      console.error('Error during registration:', error);
      setError(error.message);
    }
  };

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    signInWithPopup(auth, provider)
      .then(async (result) => {
        const user = result.user;
        await fetch('http://localhost:3001/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        });

        await signOut(auth);
        console.log('User registered with Google and logged out. Verification email sent.');
        navigate('/verify-email', { state: { email: user.email } });
      })
      .catch((error) => {
        console.error('Error:', error.message);
        setError(error.message);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      setError("Email and password are required");
      return;
    }
    handleRegistration(newUser.email, newUser.password);
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-4 col-md-6 col-sm-8">
          <div className="card shadow">
            <div className="card-body">
              <h3 className="card-title text-center">Registrar</h3>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    value={newUser.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary">Registrar</button>
                  <button type="button" className="btn btn-danger" onClick={handleGoogleSignIn}>
                    <FontAwesomeIcon icon={faGoogle} /> Regístrate con Google
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
