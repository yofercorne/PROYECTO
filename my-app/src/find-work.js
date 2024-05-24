import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './findWork.css';
import profileimg from './assets/profile.jpg';

const FindWork = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    company: '',
    jobTitle: '',
    salaryRange: '',
    jobType: '',
    availability: 'available',
    location: null,
    publicationDate: ''
  });
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 51.505, lng: -0.09 });
  const locationInputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;

  useEffect(() => {
    fetch('http://localhost:3001/api/jobs')
      .then(response => response.json())
      .then(data => {
        setJobs(data);
        setFilteredJobs(data);
      })
      .catch(console.error);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }

    if (window.google && window.google.maps) {
      const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address
          };
          handleLocationSelect(location);
        }
      });
    } else {
      window.initMapCallback = () => {
        const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current);
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address
            };
            handleLocationSelect(location);
          }
        });
      };
    }
  }, []);

  const handleJobClick = (id) => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate(`/job-details/${id}`);
    }
  };

  const renderUserImage = (imgUrl) => {
    const defaultImg = profileimg;
    const imageUrl = imgUrl ? imgUrl : defaultImg;
    return (
      <img src={imageUrl} onError={(e) => e.target.src = defaultImg} className="job-img" alt="User" />
    );
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <div className="stars">
        {Array.from({ length: fullStars }, (_, index) => (
          <i key={`full-${index}`} className="fa fa-star checked"></i>
        ))}
        {halfStar && <i key="half" className="fa fa-star-half-alt checked"></i>}
        {Array.from({ length: emptyStars }, (_, index) => (
          <i key={`empty-${index}`} className="fa fa-star"></i>
        ))}
      </div>
    );
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const handleLocationSelect = (location) => {
    setFilters({
      ...filters,
      location
    });
    setShowMap(false);
  };

  const applyFilters = () => {
    let filtered = jobs;
    if (filters.company) {
      filtered = filtered.filter(job => job.company.toLowerCase().includes(filters.company.toLowerCase()));
    }
    if (filters.salaryRange) {
      const [min, max] = filters.salaryRange.split('-').map(Number);
      filtered = filtered.filter(job => job.salary >= min && job.salary <= max);
    }
    if (filters.jobType) {
      filtered = filtered.filter(job => job.job_type.toLowerCase() === filters.jobType.toLowerCase());
    }
    if (filters.availability) {
      filtered = filtered.filter(job => job.status.toLowerCase() === filters.availability.toLowerCase());
    }
    if (filters.location) {
      filtered = filtered.filter(job => {
        if (!job.lat || !job.lng) return false;
        const distance = Math.sqrt(
          Math.pow(job.lat - filters.location.lat, 2) + Math.pow(job.lng - filters.location.lng, 2)
        );
        return distance < 0.1;
      });
    }
    if (filters.jobTitle) {
      filtered = filtered.filter(job => job.job_title.toLowerCase().includes(filters.jobTitle.toLowerCase()));
    }
    if (filters.publicationDate) {
      const daysAgo = parseInt(filters.publicationDate, 10);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysAgo);
      filtered = filtered.filter(job => new Date(job.created_at) >= dateThreshold);
    }
    setFilteredJobs(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters]);

  const initMap = () => {
    const map = new window.google.maps.Map(document.getElementById('map'), {
      center: userLocation,
      zoom: 13
    });
    mapRef.current = map;

    const marker = new window.google.maps.Marker({
      map,
      position: userLocation,
      draggable: true,
      title: 'Ubicación seleccionada'
    });
    markerRef.current = marker;

    map.addListener('click', (e) => {
      const latLng = e.latLng;
      handleLocationSelect({ lat: latLng.lat(), lng: latLng.lng() });
      marker.setPosition(latLng);
    });

    marker.addListener('dragend', (e) => {
      const latLng = e.latLng;
      handleLocationSelect({ lat: latLng.lat(), lng: latLng.lng() });
    });
  };

  useEffect(() => {
    if (showMap && window.google && window.google.maps) {
      initMap();
    }
  }, [showMap]);

  const resetFilters = () => {
    setFilters({
      company: '',
      jobTitle: '',
      salaryRange: '',
      jobType: '',
      availability: 'available',
      location: null,
      publicationDate: ''
    });
    setFilteredJobs(jobs);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredJobs.length / jobsPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-3">
          <h5 className="filter-title">Filtros de Búsqueda</h5>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Empresa"
            name="company"
            value={filters.company}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Título del Trabajo"
            name="jobTitle"
            value={filters.jobTitle}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Rango Salarial"
            name="salaryRange"
            value={filters.salaryRange}
            onChange={handleFilterChange}
          />
          <select
            className="form-control mb-3"
            name="jobType"
            value={filters.jobType}
            onChange={handleFilterChange}
          >
            <option value="">Tipo de Trabajo</option>
            <option value="Tiempo Completo">Tiempo Completo</option>
            <option value="Medio Tiempo">Medio Tiempo</option>
            <option value="Freelance">Freelance</option>
          </select>
          <select
            className="form-control mb-3"
            name="availability"
            value={filters.availability}
            onChange={handleFilterChange}
          >
            <option value="available">Disponible</option>
            <option value="expired">Expirado</option>
          </select>
          <select
            className="form-control mb-3"
            name="publicationDate"
            value={filters.publicationDate}
            onChange={handleFilterChange}
          >
            <option value="">Fecha de Publicación</option>
            <option value="1">Último día</option>
            <option value="7">Última semana</option>
            <option value="30">Último mes</option>
          </select>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Ubicación"
            ref={locationInputRef}
          />
          <button
            className="btn btn-outline-secondary w-100 mb-2"
            onClick={() => setShowMap(true)}
          >
            Seleccionar en Mapa
          </button>
          {showMap && (
            <div className="map-container">
              <div id="map" style={{ height: '300px', width: '100%' }}></div>
              <button
                className="btn btn-outline-secondary w-100 mb-2"
                onClick={() => setShowMap(false)}
              >
                Cerrar Mapa
              </button>
            </div>
          )}
          <button
            className="btn btn-primary w-100"
            onClick={resetFilters}
          >
            Restablecer Filtros
          </button>
        </div>
        <div className="col-md-9">
          <h2 className="mb-4">Trabajos Disponibles</h2>
          <div className="list-group">
            {currentJobs.map(job => (
              <div key={job.id} className="list-group-item list-group-item-action flex-column align-items-start mb-3 job-item" onClick={() => handleJobClick(job.id)}>
                <div className="d-flex w-100 justify-content-between">
                  <div className="d-flex">
                    {renderUserImage(job.user_img)}
                    <div className="ml-3">
                      <h5 className="mb-1">{job.job_title}</h5>
                      <div className="list-rating">
                        {renderStars(job.rating)}
                      </div>
                      <p className="mb-1">{job.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <small className="text-muted"><i className="fa fa-industry mr-1"></i> {job.company}</small><br />
                    <small className="text-muted"><i className="fa fa-map-marker-alt mr-1"></i> {job.location}</small><br />
                    <small className="text-muted"><i className="fa fa-dollar-sign mr-1"></i> ${job.salary}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <nav>
            <ul className="pagination">
              {pageNumbers.map(number => (
                <li key={number} className="page-item">
                  <a onClick={() => paginate(number)} className="page-link">
                    {number}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default FindWork;
