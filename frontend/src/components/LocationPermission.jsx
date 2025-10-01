import React, { useState } from 'react';
import axios from 'axios';

const LocationPermission = ({ userId, onPermissionGranted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestLocationPermission = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await axios.post(
            'http://localhost:5000/api/auth/grant-location-permission',
            {
              userId,
              latitude,
              longitude
            }
          );

          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));

          onPermissionGranted(response.data);
        } catch (err) {
          setError(err.response?.data?.message || 'Error granting location permission');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        switch(err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied. Please enable location access in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('An unknown error occurred while requesting location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>📍</div>
        <h2 style={styles.title}>Location Access Required</h2>
        <p style={styles.description}>
          To use the library seat booking system, we need access to your location.
          This helps us verify that you've reached your booked seat on time.
        </p>
        <p style={styles.info}>
          <strong>Why we need this:</strong>
          <br />
          • Confirm your attendance at booked seats
          <br />
          • Automatically cancel bookings if you don't arrive within 20 minutes
          <br />
          • Ensure fair usage of library resources
        </p>
        {error && <div style={styles.error}>{error}</div>}
        <button
          onClick={requestLocationPermission}
          disabled={loading}
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {})
          }}
        >
          {loading ? 'Requesting Permission...' : 'Grant Location Access'}
        </button>
        <p style={styles.note}>
          Your location is only used for attendance verification and is not shared with third parties.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  },
  icon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333'
  },
  description: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  info: {
    backgroundColor: '#f0f7ff',
    border: '1px solid #b3d9ff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left',
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#0066cc'
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s'
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  error: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  note: {
    fontSize: '12px',
    color: '#999',
    marginTop: '20px',
    fontStyle: 'italic'
  }
};

export default LocationPermission;