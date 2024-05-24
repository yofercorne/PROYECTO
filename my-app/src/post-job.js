import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import './postJob.css';

const PostJob = () => {
  const { user, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [jobData, setJobData] = useState({
    job_title: '',
    description: '',
    company: '',
    location: '',
    lat: null,
    lng: null,
    job_type: 'Tiempo Completo',
    salary: '',
    num_employees: 1,
    user_img: user ? user.foto : 'default.png'
  });
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [originalJobData, setOriginalJobData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const locationInputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  useEffect(() => {
    if (user && isAuthenticated) {
      fetchJobs();
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
        const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current);
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            const { lat, lng } = place.geometry.location;
            setJobData((prevState) => ({
              ...prevState,
              location: place.formatted_address,
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
          title: "Ubicación del trabajo"
        });
        markerRef.current = marker;

        const geocoder = new window.google.maps.Geocoder();
        geocoderRef.current = geocoder;

        map.addListener('click', (e) => {
          const latLng = e.latLng;
          setJobData((prevState) => ({
            ...prevState,
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
          marker.position = latLng;
          geocodeLatLng(geocoder, latLng);
        });

        marker.addListener('dragend', (e) => {
          const latLng = e.latLng;
          setJobData((prevState) => ({
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
          setJobData((prevState) => ({
            ...prevState,
            location: results[0].formatted_address,
          }));
        } else {
          console.error('No results found');
        }
      } else {
        console.error('Geocoder failed due to: ' + status);
      }
    });
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/jobs/user/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Error fetching jobs');
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobData((prevState) => ({ ...prevState, [name]: value }));
    if (name === 'num_employees' && parseInt(value, 10) > 50) {
      setAdditionalInfo('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to publish a job.');
      return;
    }

    if (!jobData.job_title) {
      setError('Job title is required.');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    let fullJobData = { ...jobData };
    if (jobData.num_employees > 50) {
      fullJobData = { ...fullJobData, additional_info: additionalInfo };
    }

    if (isEditMode) {
      let editData = Object.fromEntries(Object.entries(fullJobData).filter(([key, value]) => value !== originalJobData[key]));
      setIsLoading(true);

      try {
        const response = await fetch(`http://localhost:3001/api/jobs/${currentJobId}`, {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify(editData),
        });
        setIsLoading(false);
        if (!response.ok) throw new Error('Failed to update job');
        const data = await response.json();
        alert('Job updated successfully');
        fetchJobs(); // Refresh list after updating
        setShowForm(false); // Close the form after submission
        setIsEditMode(false); // Reset edit mode
        setJobData({
          job_title: '',
          description: '',
          company: '',
          location: '',
          lat: null,
          lng: null,
          job_type: 'Tiempo Completo',
          salary: '',
          num_employees: 1,
          user_img: user ? user.foto : 'default.png'
        }); // Reset form fields
      } catch (error) {
        setIsLoading(false);
        console.error('Error:', error);
        alert('Error updating job');
      }
    } else {
      const fullJobDataArray = Array.from({ length: jobData.num_employees }, () => ({
        user_id: user.uid,
        job_title: jobData.job_title,
        description: jobData.description || 'N/A',
        company: jobData.company || 'N/A',
        location: jobData.location || 'N/A',
        lat: jobData.lat,
        lng: jobData.lng,
        job_type: jobData.job_type,
        salary: jobData.salary || 0,
        status: 'Available',
        user_img: user ? user.foto : 'default.png',
        additional_info: jobData.num_employees > 50 ? additionalInfo : ''
      }));

      setIsLoading(true);

      try {
        const promises = fullJobDataArray.map(jobData =>
          fetch('http://localhost:3001/api/jobs', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(jobData),
          })
        );
        await Promise.all(promises);
        setIsLoading(false);
        alert('Jobs created successfully');
        fetchJobs(); // Refresh list after posting
        setShowForm(false); // Close the form after submission
        setJobData({
          job_title: '',
          description: '',
          company: '',
          location: '',
          lat: null,
          lng: null,
          job_type: 'Tiempo Completo',
          salary: '',
          num_employees: 1,
          user_img: user ? user.foto : 'default.png'
        }); // Reset form fields
      } catch (error) {
        setIsLoading(false);
        console.error('Error:', error);
        alert('Error creating jobs');
      }
    }
  };

  const handleEdit = (job) => {
    if (job.user_id !== user.uid) {
      alert('You can only edit your own jobs.');
      return;
    }
    setJobData({
      job_title: job.job_title,
      description: job.description,
      company: job.company,
      location: job.location,
      lat: job.lat,
      lng: job.lng,
      job_type: job.job_type,
      salary: job.salary,
      num_employees: 1,
      user_img: job.user_img
    });
    setOriginalJobData({
      job_title: job.job_title,
      description: job.description,
      company: job.company,
      location: job.location,
      lat: job.lat,
      lng: job.lng,
      job_type: job.job_type,
      salary: job.salary,
      user_img: job.user_img
    });
    setCurrentJobId(job.id);
    setIsEditMode(true);
    setShowForm(true);
  };

  const handleStatusToggle = async (job) => {
    const updatedStatus = job.status === 'Available' ? 'Expired' : 'Available';

    try {
      const response = await fetch(`http://localhost:3001/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: updatedStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchJobs(); // Refresh list after updating status
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || job.user_id !== user.uid) {
      alert('You can only delete your own jobs.');
      return;
    }
    const confirmed = window.confirm('Are you sure you want to delete this job?');
    if (confirmed) {
      try {
        const response = await fetch(`http://localhost:3001/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to delete job');
        alert('Job deleted successfully');
        fetchJobs(); // Refresh list after deletion
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Error deleting job');
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
          <h5 className="card-title">{isEditMode ? 'Edit Job' : 'Post a New Job'}</h5>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Hide Form' : isEditMode ? 'Edit Job' : 'Publish New Job'}
          </button>
          {showForm && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  className="form-control"
                  name="job_title"
                  value={jobData.job_title}
                  onChange={handleChange}
                  placeholder="Título del Trabajo"
                  required
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  className="form-control"
                  name="company"
                  value={jobData.company}
                  onChange={handleChange}
                  placeholder="Nombre de la Empresa"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  name="description"
                  value={jobData.description}
                  onChange={handleChange}
                  placeholder="Descripción del Trabajo"
                ></textarea>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  className="form-control"
                  name="location"
                  value={jobData.location}
                  onChange={handleChange}
                  ref={locationInputRef}
                  placeholder="Ubicación"
                />
              </div>
              <div className="form-group">
                <label>Location on Map</label>
                <div id="map" style={{ height: '300px', width: '100%' }}></div>
              </div>
              <div className="form-group">
                <label>Job Type</label>
                <select
                  className="form-control"
                  name="job_type"
                  value={jobData.job_type}
                  onChange={handleChange}
                >
                  <option value="Tiempo Completo">Tiempo Completo</option>
                  <option value="Medio Tiempo">Medio Tiempo</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
              <div className="form-group">
                <label>Salary ($)</label>
                <input
                  type="number"
                  className="form-control"
                  name="salary"
                  value={jobData.salary}
                  onChange={handleChange}
                  placeholder="Salario"
                />
              </div>
              {!isEditMode && (
                <div className="form-group">
                  <label>Número de Empleados</label>
                  <input
                    type="number"
                    className="form-control"
                    name="num_employees"
                    value={jobData.num_employees}
                    onChange={handleChange}
                    min="1"
                    placeholder="Cantidad de Empleados"
                  />
                </div>
              )}
              {!isEditMode && jobData.num_employees > 50 && (
                <div className="form-group">
                  <label>Justificación para la alta cantidad de empleados</label>
                  <textarea
                    className="form-control"
                    name="additional_info"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Proporcione información adicional sobre la contratación masiva"
                  ></textarea>
                </div>
              )}
              {error && <div className="alert alert-danger">{error}</div>}
              <button type="submit" className="btn btn-success mt-3" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          )}
          <div className="mt-4">
            {jobs.map((job) => (
              <div key={job.id} className="card mt-2">
                <div className="card-body">
                  <h5 className="card-title">
                    {job.job_title} - {job.status}
                  </h5>
                  <p className="card-text">{job.description}</p>
                  <p className="card-text">Company: {job.company}</p>
                  <p className="card-text">Location: {job.location}</p>
                  <p className="card-text">Salary: ${job.salary}</p>
                  <div className="d-flex justify-content-between">
                    <button className="btn btn-warning" onClick={() => handleEdit(job)}>
                      Edit
                    </button>
                    <button
                      className={`btn ${job.status === 'Available' ? 'btn-success' : 'btn-danger'}`}
                      onClick={() => handleStatusToggle(job)}
                    >
                      {job.status === 'Available' ? 'Available' : 'Expired'}
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(job.id)}>
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

export default PostJob;
