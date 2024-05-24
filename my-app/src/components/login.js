import appfirebase from '../credenciales';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

const Login = ({ setAuth }) => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth(); // Assuming Firebase is initialized elsewhere
  

  const googleSignIn = () => {
    const provider = new GoogleAuthProvider();
    // Solicitar acceso a la información del perfil y al correo electrónico del usuario
    provider.addScope('profile');
    provider.addScope('email');
    
    signInWithPopup(auth, provider)
        .then((result) => {
            // Datos del token de Google, que no necesitas para obtener datos de perfil
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;

            // Datos del usuario
            const user = result.user;
            const { displayName, email, photoURL } = user;

            console.log('Logged in user info:',displayName, email, photoURL);

            // Llama a handleLogin o maneja la creación de un nuevo usuario aquí
            handleLogin(email, displayName);

            login(); // Actualiza el estado de login en tu contexto
            navigate('/'); // Navega a la página principal
        })
        .catch((error) => {
            const errorMessage = error.message;
            setError(errorMessage);
        });
};

const handleLogin = (email, fullName) => {
  let firstName = 'Nombre por defecto';
  let lastName = 'Apellido por defecto';

  if (fullName && fullName.includes(' ')) {
      const names = fullName.split(' ');
      firstName = names[0];
      lastName = names.length > 1 ? names[1] : lastName;
  }

  // Verifica primero si el usuario ya existe en la base de datos
  fetch(`http://localhost:3001/api/check-user?email=${encodeURIComponent(email)}`)
      .then(response => response.json())
      .then(data => {
          if (!data.exists) {
              // Si el usuario no existe, procede a registrarlo
              const newUser = {
                  id: auth.currentUser.uid,  // Usa el UID de Firebase
                  correo: email,
                  nombre: firstName,
                  apellido: lastName,
                  edad: '0',
                  direccion: 'Dirección por defecto',
              };
              return fetch('http://localhost:3001/api/user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newUser)
              }).then(response => {
                  if (response.ok) {
                      console.log("Usuario registrado con éxito en la base de datos local.");
                      return response.json();
                  } else {
                      throw new Error("Falló el registro en la base de datos local.");
                  }
              });
          } else {
              console.log('Usuario ya existe, datos del usuario:', data.user);
              return Promise.resolve();  // No necesita hacer nada si el usuario ya existe
          }
      })
      .catch(error => {
          console.error('Error:', error);
      });
};




  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      console.log(userCredential.user);
      handleLogin(userCredential.user.email); // Manejar lógica post-login
      login(); // Establecer estado de autenticación
      navigate('/'); // Redirige a inicio después de iniciar sesión
    } catch (error) {
      console.error('Error de inicio de sesión', error);
      setError(error.message);
    }
  };
  
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const { email } = result.user;
      handleLogin(email);
      login();
      navigate('/');
    } catch (error) {
      console.error('Error con el inicio de sesión de Google', error);
      setError(error.message);
    }
  };
  

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-4 col-md-6 col-sm-8">
          <div className="card shadow">
            <div className="card-body">
              <h3 className="card-title text-center">Iniciar sesión</h3>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={credentials.email}
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
                    value={credentials.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary">Ingresar</button>
                  <button type="button" className="btn btn-danger" onClick={googleSignIn}>
                    <FontAwesomeIcon icon={faGoogle} /> Iniciar sesión con Google
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