import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth } from '../AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import appfirebase from '../credenciales';

const Login = () => {
  const [userCredentials, setUserCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const auth = getAuth(appfirebase);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserCredentials({ ...userCredentials, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userCredentials.email || !userCredentials.password) {
      setError("Email and password are required");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, userCredentials.email, userCredentials.password);
      const user = userCredential.user;
      if (user.emailVerified) {
        login(user);
        navigate('/'); // Redirigir al usuario a la página de inicio después de iniciar sesión
      } else {
        setError("Please verify your email before logging in.");
      }
    } catch (error) {
      console.error('Error during sign in:', error);
      setError(error.message);
    }
  };

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        if (user.emailVerified) {
          login(user);
          navigate('/'); // Redirigir al usuario a la página de inicio después de iniciar sesión
        } else {
          setError("Please verify your email before logging in.");
        }
      })
      .catch((error) => {
        console.error('Error:', error.message);
        setError(error.message);
      });
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-4 col-md-6 col-sm-8">
          <div className="card shadow">
            <div className="card-body">
              <h3 className="card-title text-center">Iniciar Sesión</h3>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={userCredentials.email}
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
                    value={userCredentials.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary">Iniciar Sesión</button>
                  <button type="button" className="btn btn-danger" onClick={handleGoogleSignIn}>
                    <FontAwesomeIcon icon={faGoogle} /> Inicia sesión con Google
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

export default Login;
