// Other imports remain the same
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth } from '../AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import {signInWithEmailAndPassword } from 'firebase/auth';
import appfirebase from '../credenciales';

const Register = () => {
  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const auth = getAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });  // Asegúrate de que este manejo está capturando correctamente los valores de los campos de entrada.
};

 


const handleRegistration = (email, firstName,lastName, firebaseUserId) => {
  const newUser = {
      id: firebaseUserId, // UID from Firebase
      correo: email,
      nombre: firstName,
      apellido: lastName,
      edad: '0',
      direccion: 'Dirección por defecto'
  };

  fetch('http://localhost:3001/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
  })
  .then(response => {
      if (!response.ok) throw new Error('Failed to register user in local DB');
      return response.json();
  })
  .then(info => {
      console.log('New user registered in DB:', info);
      navigate('/');
  })
  .catch(error => {
      console.error('Error registering user in DB:', error);
      setError(error.message);
  });
};

  


const handleGoogleSignIn = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  
  signInWithPopup(auth, provider)
      .then((result) => {
          const user = result.user;
          // Asegúrate de pasar el ID de usuario de Firebase correcto, y el correo y nombre separados correctamente
          const nameParts = user.displayName ? user.displayName.split(' ') : ['Nombre', 'Apellido'];
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts[1] : '';
          handleRegistration(user.email, firstName, lastName, user.uid); // Pasar correo, primer nombre, y UID
          login(); // Actualiza el estado de login en tu contexto
          navigate('/'); // Navega a la página principal
      })
      .catch((error) => {
          console.error('Error:', error.message);
          setError(error.message);
      });
};




  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Attempting to register with:", newUser.email, newUser.password);  // Asegúrate de que ambos valores se muestren correctamente
    if (!newUser.email || !newUser.password) {
        setError("Email and password are required");  // Verifica que ambos campos estén presentes
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      console.log('Firebase user created:', userCredential.user.uid);
      handleRegistration(newUser.email, newUser.password, userCredential.user.uid); // Pasar UID para la creación en la base de datos
    } catch (error) {
      console.error('Error during sign up:', error);
      setError(error.message);
    }
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
