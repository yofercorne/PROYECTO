import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaStar, FaStarHalfAlt } from 'react-icons/fa';
import { useAuth } from './AuthContext'; // Importa el contexto de autenticación

const JobDetails = () => {
  const { id } = useParams();
  const { user } = useAuth(); // Obtén el usuario autenticado del contexto
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [submittedRating, setSubmittedRating] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3001/api/jobs/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data) {
          setError('No data found for this job');
        } else {
          setJob(data);
          if (user && user.uid) {
            fetch(`http://localhost:3001/api/ratings/job/${id}/user/${user.uid}`) // Usa el ID del usuario autenticado
              .then(response => {
                if (!response.ok) {
                  if (response.status === 404) {
                    return null;
                  }
                  throw new Error(`HTTP status ${response.status}`);
                }
                return response.json();
              })
              .then(ratingData => {
                if (ratingData && ratingData.rating) {
                  setUserRating(ratingData.rating);
                }
              })
              .catch(error => {
                if (error.message !== 'HTTP status 404') {
                  setError(error.toString());
                }
              });
          } else {
            setError('User not authenticated');
          }
        }
      })
      .catch(error => {
        setError(error.toString());
      });
  }, [id, user]);

  const handleRating = (rating) => {
    setUserRating(rating);
    if (user && user.uid) {
      fetch('http://localhost:3001/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: id,
          userId: user.uid, // Usa el ID del usuario autenticado
          rating: rating,
        }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          setSubmittedRating(true);
          fetch(`http://localhost:3001/api/jobs/${id}`)
            .then(response => response.json())
            .then(data => {
              setJob(data);
            });
        })
        .catch(error => {
          setError(error.message);
        });
    } else {
      setError('User not authenticated');
    }
  };

  if (error) {
    return <div style={styles.errorMessage}>Error: {error}</div>;
  }

  if (!job) {
    return <div style={styles.loadingMessage}>Loading...</div>;
  }

  const renderStars = (rating, interactive = false) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <div style={styles.rating}>
        {Array.from({ length: fullStars }, (_, index) => (
          <FaStar
            key={`full-${index}`}
            style={styles.fullStar}
            onClick={() => interactive && handleRating(index + 1)}
          />
        ))}
        {halfStar && (
          <FaStarHalfAlt
            key="half"
            style={styles.halfStar}
            onClick={() => interactive && handleRating(fullStars + 0.5)}
          />
        )}
        {Array.from({ length: emptyStars }, (_, index) => (
          <FaStar
            key={`empty-${index}`}
            style={styles.emptyStar}
            onClick={() => interactive && handleRating(fullStars + halfStar + index + 1)}
          />
        ))}
      </div>
    );
  };

  const averageRating = job.rating ? parseFloat(job.rating).toFixed(1) : '0.0';

  const statusStyles = job.status === 'Available' ? styles.statusAvailable : styles.statusUnavailable;

  const userImage = job.user_img || '/path/to/default-image.jpg'; // Ruta a la imagen predeterminada

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.cardImage}>
          <img src={userImage} alt={job.job_title} style={styles.image} />
        </div>
        <div style={styles.cardBody}>
          <div style={styles.cardHeader}>
            <h1 style={styles.cardTitle}>{job.job_title}</h1>
            <h2 style={styles.cardSubtitle}>Offered by: {job.company}</h2>
            <div style={{ ...styles.status, ...statusStyles }}>{job.status}</div>
            <div style={styles.ratingSection}>
              {renderStars(parseFloat(job.rating) || 0)}
              <p style={styles.ratingScore}>{averageRating} / 5.0 ({job.rating_count} reviews)</p>
            </div>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Description:</span>
            <span style={styles.detailValue}>{job.description}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Salary:</span>
            <span style={styles.detailValue}>${job.salary}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Location:</span>
            <span style={styles.detailValue}>{job.location}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Job Type:</span>
            <span style={styles.detailValue}>{job.job_type}</span>
          </div>
          <div style={styles.userRatingSection}>
            <h5 style={styles.sectionTitle}>Your Rating:</h5>
            {renderStars(userRating, true)}
            <p style={styles.ratingScore}>{userRating} / 5.0</p>
            {submittedRating && <p style={styles.successMessage}>Thanks for your rating!</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: 'auto',
    padding: '20px'
  },
  card: {
    display: 'flex',
    flexDirection: 'row',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white'
  },
  cardImage: {
    flex: '1',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: {
    maxWidth: '100%',
    borderRadius: '8px'
  },
  cardBody: {
    flex: '2',
    padding: '20px'
  },
  cardHeader: {
    borderBottom: '1px solid #ddd',
    paddingBottom: '10px',
    marginBottom: '10px'
  },
  cardTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: '0 0 10px 0'
  },
  cardSubtitle: {
    fontSize: '1.2rem',
    color: '#555',
    margin: '0 0 10px 0'
  },
  status: {
    fontWeight: 'bold',
    padding: '5px 10px',
    borderRadius: '4px',
    display: 'inline-block',
    marginBottom: '10px'
  },
  statusAvailable: {
    backgroundColor: 'green',
    color: 'white'
  },
  statusUnavailable: {
    backgroundColor: 'red',
    color: 'white'
  },
  ratingSection: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px'
  },
  fullStar: {
    color: 'gold',
    fontSize: '2rem',
    marginRight: '0.2rem',
    cursor: 'pointer'
  },
  halfStar: {
    color: 'gold',
    fontSize: '2rem',
    marginRight: '0.2rem',
    cursor: 'pointer'
  },
  emptyStar: {
    color: 'lightgray',
    fontSize: '2rem',
    marginRight: '0.2rem',
    cursor: 'pointer'
  },
  ratingScore: {
    marginLeft: '10px',
    fontSize: '1rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  detailLabel: {
    fontWeight: 'bold'
  },
  detailValue: {
    color: '#555'
  },
  userRatingSection: {
    marginTop: '20px'
  },
  sectionTitle: {
    fontWeight: 'bold'
  },
  errorMessage: {
    color: 'red',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '20px 0'
  },
  loadingMessage: {
    fontWeight: 'bold',
    fontSize: '1.5rem',
    textAlign: 'center',
    marginTop: '2rem'
  },
  successMessage: {
    color: 'green',
    fontWeight: 'bold',
    marginTop: '10px'
  }
};

export default JobDetails;
