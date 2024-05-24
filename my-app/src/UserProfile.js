import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import './UserProfile.css';
import profileimg from './assets/profile.jpg';

const UserProfile = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState({ nombre: '', apellido: '', edad: '', direccion: '', foto: '' });
  const [isLoaded, setIsLoaded] = useState(false);  // Nuevo estado para controlar la carga inicial

  const [editMode, setEditMode] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [originalPhoto, setOriginalPhoto] = useState(''); // Estado para guardar la foto original

  useEffect(() => {
    if (user && user.uid && !isLoaded) {  // Asegúrate de que se ejecute solo una vez que el usuario está completamente cargado y solo una vez
      fetch(`http://localhost:3001/api/user/${user.uid}`)
        .then(response => response.json())
        .then(data => {
          setProfile({
            nombre: data.nombre || '',
            apellido: data.apellido || '',
            edad: data.edad || '',
            direccion: data.direccion || '',
            foto: data.foto || profileimg
          });
          setOriginalPhoto(data.foto); // Guarda la foto actual como original
          setIsLoaded(true);  // Establecer que los datos se han cargado
        })
        .catch(error => console.error('Error al obtener los datos del usuario:', error));
    } else {
      console.log("Esperando datos del usuario...");
    }
  }, [user, user?.uid]); // Añade 'user?.uid' como dependencia si es necesario

  const handleEdit = () => {
    setEditMode(!editMode);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(`http://localhost:3001/api/user/${user.uid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    })
    .then(response => response.json())
    .then(() => setIsUpdatingImage(false))
    .catch(error => console.error('Error al actualizar el perfil:', error));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, foto: reader.result }));
      };
      reader.readAsDataURL(file);
      setIsUpdatingImage(true);
    }
  };

  const handleFileChange = () => {
    const file = fileInputRef.current.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePic', file);
    formData.append('userId', user.uid);

    fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      if (data.imageUrl) {
        setProfile(prev => ({ ...prev, foto: `http://localhost:3001${data.imageUrl}` }));
        setOriginalPhoto(`http://localhost:3001${data.imageUrl}`);

        // Actualizar la base de datos después de cargar la imagen
        fetch(`http://localhost:3001/api/user/${user.uid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto: `http://localhost:3001${data.imageUrl}` })
        });

        // Actualizar la imagen en la tabla de servicios
        fetch(`http://localhost:3001/api/services/${user.uid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_img: `http://localhost:3001${data.imageUrl}` })
        })
        .then(() => setIsUpdatingImage(false))
        .catch(error => console.error('Error al actualizar la imagen del servicio:', error));
      }
    })
    .catch(error => {
      console.error('Error al subir la imagen:', error);
      setIsUpdatingImage(false);  // Oculta los botones si hay un error
    });
  };

  const handleCancel = () => {
    setProfile(prev => ({ ...prev, foto: originalPhoto })); // Restablece la foto original
    setIsUpdatingImage(false);
  };

  const imageUrl = profile.foto.startsWith('http') ? profile.foto : `http://localhost:3001${profile.foto}`;

  if (loading || !isLoaded) return <p>Cargando perfil...</p>;

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow-lg">
            <div className="profile-image-container">
              <img src={profile.foto} alt="Profile Image" className="card-img-top"
                   style={{ height: '300px', objectFit: 'cover' }} 
                   onError={(e) => { e.target.onerror = null; e.target.src = profileimg; }} />

              {isUpdatingImage ? (
                <>
                  <button className="btn btn-success save-image-btn" onClick={handleFileChange}>Guardar</button>
                  <button className="btn btn-danger cancel-image-btn" onClick={handleCancel}>Cancelar</button>
                </>
              ) : (
                <button className="btn btn-primary edit-image-btn" onClick={() => {
                  fileInputRef.current.click();
                  setOriginalPhoto(profile.foto);
                }}>Editar Imagen</button>
              )}

              <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileSelect} />
            </div>
            <div className="card-body">
              {!editMode ? (
                <div>
                  <h5 className="card-title">{profile.nombre} {profile.apellido}</h5>
                  <p className="card-text">Edad: {profile.edad}</p>
                  <p className="card-text">Dirección: {profile.direccion}</p>
                  <button onClick={handleEdit} className="btn btn-primary">Editar Perfil</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <input type="text" name="nombre" value={profile.nombre} onChange={handleChange} className="form-control mb-2" placeholder="Nombre" />
                  <input type="text" name="apellido" value={profile.apellido} onChange={handleChange} className="form-control mb-2" placeholder="Apellido" />
                  <input type="number" name="edad" value={profile.edad} onChange={handleChange} className="form-control mb-2" placeholder="Edad" />
                  <textarea name="direccion" value={profile.direccion} onChange={handleChange} className="form-control mb-2" placeholder="Dirección" />
                  <button type="submit" className="btn btn-success">Guardar Cambios</button>
                  <button onClick={handleEdit} className="btn btn-secondary">Cancelar</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
