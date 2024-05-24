import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import './postService.css';

const PostService = () => {
  const { user, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [serviceData, setServiceData] = useState({
    dni: '',
    phone: '',
    address: '',
    lat: null,
    lng: null,
    description: '',
    service_type: '',
    modalities: 'Presencial',
    cost: '',
    user_img: ''
  });
  const [originalServiceData, setOriginalServiceData] = useState(null);
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState(null);
  const addressInputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  useEffect(() => {
    if (user && isAuthenticated) {
      fetchServices();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (typeof window.google !== 'undefined' && window.google.maps) {
        initMap();
      } else {
        window.initMapCallback = initMap;
      }
    };

    const initMap = async () => {
      if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");
        const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current);
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            const { lat, lng } = place.geometry.location;
            setServiceData((prevState) => ({
              ...prevState,
              address: place.formatted_address,
              lat: lat(),
              lng: lng(),
            }));
            if (mapRef.current && markerRef.current) {
              mapRef.current.setCenter({ lat: lat(), lng: lng() });
              markerRef.current.position = { lat: lat(), lng: lng() };
            }
          }
        });

        const map = new window.google.maps.Map(document.getElementById('map'), {
          center: { lat: -34.397, lng: 150.644 },
          zoom: 8,
          mapId: "DEMO_MAP_ID",
        });
        mapRef.current = map;

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: -34.397, lng: 150.644 },
          draggable: true,
          title: "Ubicación del servicio"
        });
        markerRef.current = marker;

        const geocoder = new window.google.maps.Geocoder();
        geocoderRef.current = geocoder;

        map.addListener('click', (e) => {
          const latLng = e.latLng;
          setServiceData((prevState) => ({
            ...prevState,
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
          marker.position = latLng;
          geocodeLatLng(geocoder, latLng);
        });

        marker.addListener('dragend', (e) => {
          const latLng = e.latLng;
          setServiceData((prevState) => ({
            ...prevState,
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
          geocodeLatLng(geocoder, latLng);
        });
      }
    };

    if (showForm) {
      loadGoogleMaps();
    }

    return () => {
      window.initMapCallback = null;
    };
  }, [showForm]);

  const geocodeLatLng = (geocoder, latLng) => {
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK') {
        if (results[0]) {
          setServiceData((prevState) => ({
            ...prevState,
            address: results[0].formatted_address,
          }));
        } else {
          console.error('No results found');
        }
      } else {
        console.error('Geocoder failed due to: ' + status);
      }
    });
  };

  const fetchServices = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/services/user/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Error fetching services');
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setServiceData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to publish a service.');
      return;
    }

    if (!serviceData.service_type) {
      setError('Service type is required.');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    if (isEditMode) {
      // PATCH
      let fullServiceData = Object.fromEntries(Object.entries(serviceData).filter(([key, value]) => value !== originalServiceData[key]));
      setIsLoading(true);

      console.log('Submitting PATCH request with data:', fullServiceData);

      try {
        const response = await fetch(`http://localhost:3001/api/services/${currentServiceId}`, {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify(fullServiceData),
        });
        setIsLoading(false);
        if (!response.ok) throw new Error('Failed to update service');
        const data = await response.json();
        console.log('Server response:', data);
        alert('Service updated successfully');
        fetchServices(); // Refresh list after updating
        setShowForm(false); // Close the form after submission
        setIsEditMode(false); // Reset edit mode
        setServiceData({
          dni: '',
          phone: '',
          address: '',
          lat: null,
          lng: null,
          description: '',
          service_type: '',
          modalities: 'Presencial',
          cost: '',
          user_img: ''
        }); // Reset form fields
      } catch (error) {
        setIsLoading(false);
        console.error('Error:', error);
        alert('Error updating service');
      }
    } else {
      // POST
      const fullServiceData = {
        user_id: user.uid,
        dni: serviceData.dni || 'N/A',
        phone: serviceData.phone || 'N/A',
        address: serviceData.address || 'N/A',
        lat: serviceData.lat,
        lng: serviceData.lng,
        description: serviceData.description || 'N/A',
        service_type: serviceData.service_type,
        modalities: serviceData.modalities,
        cost: serviceData.cost || 0,
        status: 'Available',
        user_img: serviceData.user_img || 'default.png'
      };

      setIsLoading(true);

      console.log('Submitting POST request with data:', fullServiceData);

      try {
        const response = await fetch('http://localhost:3001/api/services', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(fullServiceData),
        });
        setIsLoading(false);
        if (!response.ok) throw new Error('Failed to create service');
        const data = await response.json();
        console.log('Server response:', data);
        alert('Service created successfully');
        fetchServices(); // Refresh list after posting
        setShowForm(false); // Close the form after submission
        setServiceData({
            dni: '',
            phone: '',
            address: '',
            lat: null,
            lng: null,
            description: '',
            service_type: '',
            modalities: 'Presencial',
            cost: '',
            user_img: ''
        }); // Reset form fields
      } catch (error) {
        setIsLoading(false);
        console.error('Error:', error);
        alert('Error creating service');
      }
    }
  };

  const handleEdit = (service) => {
    if (service.user_id !== user.uid) {
      alert('You can only edit your own services.');
      return;
    }
    setServiceData({
      dni: service.dni,
      phone: service.phone,
      address: service.address,
      lat: service.lat,
      lng: service.lng,
      description: service.description,
      service_type: service.service_type,
      modalities: service.modalities,
      cost: service.cost,
      user_img: service.user_img
    });
    setOriginalServiceData({
      dni: service.dni,
      phone: service.phone,
      address: service.address,
      lat: service.lat,
      lng: service.lng,
      description: service.description,
      service_type: service.service_type,
      modalities: service.modalities,
      cost: service.cost,
      user_img: service.user_img
    });
    setCurrentServiceId(service.id);
    setIsEditMode(true);
    setShowForm(true);
  };

  const handleStatusToggle = async (service) => {
    const updatedStatus = service.status === 'Available' ? 'Expired' : 'Available';

    try {
      const response = await fetch(`http://localhost:3001/api/services/${service.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: updatedStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchServices(); // Refresh list after updating status
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (!service || service.user_id !== user.uid) {
      alert('You can only delete your own services.');
      return;
    }
    const confirmed = window.confirm('Are you sure you want to delete this service?');
    if (confirmed) {
      try {
        const response = await fetch(`http://localhost:3001/api/services/${serviceId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to delete service');
        alert('Service deleted successfully');
        fetchServices(); // Refresh list after deletion
      } catch (error) {
        console.error('Error deleting service:', error);
        alert('Error deleting service');
      }
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">{isEditMode ? 'Edit Service' : 'Post a New Service'}</h5>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Hide Form' : isEditMode ? 'Edit Service' : 'Publish New Job'}
          </button>
          {showForm && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Service Type</label>
                <input
                  type="text"
                  className="form-control"
                  name="service_type"
                  value={serviceData.service_type}
                  onChange={handleChange}
                  placeholder="Tipo de Servicio"
                  required
                />
              </div>
              <div className="form-group">
                <label>DNI</label>
                <input
                  type="text"
                  className="form-control"
                  name="dni"
                  value={serviceData.dni}
                  onChange={handleChange}
                  placeholder="Ingrese DNI"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  name="phone"
                  value={serviceData.phone}
                  onChange={handleChange}
                  placeholder="Ingrese número de teléfono"
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  className="form-control"
                  name="address"
                  value={serviceData.address}
                  onChange={handleChange}
                  ref={addressInputRef}
                  placeholder="Ingrese dirección"
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <div id="map" style={{ height: '300px', width: '100%' }}></div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  name="description"
                  value={serviceData.description}
                  onChange={handleChange}
                  placeholder="Ingrese descripción del servicio"
                ></textarea>
              </div>
              <div className="form-group">
                <label>Modalities</label>
                <select
                  className="form-control"
                  name="modalities"
                  value={serviceData.modalities}
                  onChange={handleChange}
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Ambos">Ambos</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cost ($)</label>
                <input
                  type="number"
                  className="form-control"
                  name="cost"
                  value={serviceData.cost}
                  onChange={handleChange}
                  placeholder="Ingrese costo del servicio"
                />
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <button type="submit" className="btn btn-success mt-3" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          )}
          <div className="mt-4">
            {services.map((service) => (
              <div key={service.id} className="card mt-2">
                <div className="card-body">
                  <h5 className="card-title">
                    {service.service_type} - {service.status}
                  </h5>
                  <p className="card-text">{service.description}</p>
                  <p className="card-text">Cost: ${service.cost}</p>
                  <p className="card-text">Modalities: {service.modalities}</p>
                  <p className="card-text">Address: {service.address}</p>
                  <p className="card-text">Phone: {service.phone}</p>
                  <div className="d-flex justify-content-between">
                    <button className="btn btn-warning" onClick={() => handleEdit(service)}>
                      Edit
                    </button>
                    <button
                      className={`btn ${service.status === 'Available' ? 'btn-success' : 'btn-danger'}`}
                      onClick={() => handleStatusToggle(service)}
                    >
                      {service.status === 'Available' ? 'Available' : 'Expired'}
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(service.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostService;
