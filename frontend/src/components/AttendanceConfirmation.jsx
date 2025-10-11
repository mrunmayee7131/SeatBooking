import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AttendanceConfirmation = ({ booking, onAttendanceConfirmed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [locationInfo, setLocationInfo] = useState(null);

  useEffect(() => {
    // Calculate time remaining for attendance confirmation
    const calculateTimeRemaining = () => {
      const now = new Date();
      const bookingDate = new Date(booking.date);
      const [hours, minutes] = booking.startTime.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const deadlineTime = new Date(bookingDate.getTime() + 20 * 60 * 1000);
      const diff = deadlineTime - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutesLeft = Math.floor(diff / 60000);
      const secondsLeft = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutesLeft}m ${secondsLeft}s`);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [booking]);

  const confirmAttendance = () => {
    setLoading(true);
    setError('');
    setDistance(null);
    setLocationInfo(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    console.log('🔍 Requesting location with high accuracy...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          
          console.log('📍 Location obtained:', {
            latitude,
            longitude,
            accuracy: `±${Math.round(accuracy)}m`
          });

          setLocationInfo({
            latitude,
            longitude,
            accuracy
          });

          // First update user location
          const locationResponse = await axios.post(
            'http://localhost:5000/api/users/update-location',
            { latitude, longitude },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );

          console.log('📊 Distance from library:', locationResponse.data.distanceFromLibrary, 'meters');
          setDistance(locationResponse.data.distanceFromLibrary);

          // Then confirm attendance
          const response = await axios.post(
            `http://localhost:5000/api/bookings/confirm-attendance/${booking._id}`,
            { latitude, longitude },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );

          if (response.data.attendanceConfirmed) {
            console.log('✅ Attendance confirmed successfully');
            onAttendanceConfirmed(response.data.booking);
          } else {
            console.log('❌ Attendance denied:', response.data.message);
            setError(response.data.message);
          }
        } catch (err) {
          console.error('❌ Error:', err);
          setError(err.response?.data?.message || 'Error confirming attendance');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        console.error('❌ Geolocation error:', err);
        
        let errorMessage = 'Unable to get your location. ';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage += 'Please enable location permissions in your browser.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
        }
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,  // Use GPS for best accuracy
        timeout: 15000,            // Wait up to 15 seconds
        maximumAge: 0              // Don't use cached position
      }
    );
  };

  if (booking.attendanceConfirmed) {
    return (
      <div style={styles.confirmedCard}>
        <div style={styles.successIcon}>✓</div>
        <h3 style={styles.confirmedTitle}>Attendance Confirmed</h3>
        <p style={styles.confirmedText}>
          Your attendance was confirmed at {new Date(booking.attendanceConfirmedAt).toLocaleTimeString()}
        </p>
      </div>
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <div style={styles.cancelledCard}>
        <div style={styles.cancelIcon}>✕</div>
        <h3 style={styles.cancelTitle}>Booking Cancelled</h3>
        <p style={styles.cancelText}>
          {booking.cancellationReason || 'This booking has been cancelled'}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>Confirm Your Attendance</h3>
          <div style={styles.timer}>
            <span style={styles.timerLabel}>Time Remaining:</span>
            <span style={styles.timerValue}>{timeRemaining}</span>
          </div>
        </div>

        <div style={styles.bookingInfo}>
          <div style={styles.infoRow}>
            <span style={styles.label}>Seat:</span>
            <span style={styles.value}>{booking.seat?.seatNumber}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Time:</span>
            <span style={styles.value}>
              {booking.startTime} - {booking.endTime}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Date:</span>
            <span style={styles.value}>
              {new Date(booking.date).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div style={styles.instructions}>
          <p style={styles.instructionText}>
            📍 You must be within 100 meters of the library to confirm attendance.
          </p>
          <p style={styles.warningText}>
            ⚠️ If you don't confirm within 20 minutes of your booking start time, 
            your booking will be automatically cancelled.
          </p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {locationInfo && (
          <div style={styles.locationDebug}>
            <h4 style={styles.debugTitle}>📍 Your Location:</h4>
            <p style={styles.debugText}>Latitude: {locationInfo.latitude.toFixed(6)}</p>
            <p style={styles.debugText}>Longitude: {locationInfo.longitude.toFixed(6)}</p>
            <p style={styles.debugText}>Accuracy: ±{Math.round(locationInfo.accuracy)} meters</p>
          </div>
        )}

        {distance !== null && (
          <div style={{
            ...styles.distanceInfo,
            ...(distance <= 100 ? styles.distanceSuccess : styles.distanceError)
          }}>
            <strong>Distance from library: {distance} meters</strong>
            <p style={{margin: '5px 0 0 0', fontSize: '13px'}}>
              {distance <= 100 ? '✅ You are within range!' : '❌ You are too far from the library'}
            </p>
          </div>
        )}

        <button
          onClick={confirmAttendance}
          disabled={loading || timeRemaining === 'Expired'}
          style={{
            ...styles.button,
            ...((loading || timeRemaining === 'Expired') ? styles.buttonDisabled : {})
          }}
        >
          {loading ? 'Getting Location...' : 'Confirm I\'m Here'}
        </button>

        <div style={styles.tips}>
          <p style={styles.tipTitle}>💡 Tips for accurate location:</p>
          <ul style={styles.tipList}>
            <li>Make sure you're connected to the internet</li>
            <li>Allow location permissions when prompted</li>
            <li>For best results, be outdoors or near a window</li>
            <li>Wait a few seconds for GPS to get accurate fix</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px'
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
    border: '1px solid #ffc107'
  },
  timerLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#856404'
  },
  timerValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#d39e00'
  },
  bookingInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e9ecef'
  },
  label: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '600'
  },
  value: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500'
  },
  instructions: {
    backgroundColor: '#e7f3ff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px'
  },
  instructionText: {
    fontSize: '14px',
    color: '#0066cc',
    marginBottom: '8px',
    lineHeight: '1.5'
  },
  warningText: {
    fontSize: '13px',
    color: '#d9534f',
    lineHeight: '1.5',
    margin: 0
  },
  locationDebug: {
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd'
  },
  debugTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#333'
  },
  debugText: {
    margin: '4px 0',
    fontSize: '13px',
    color: '#666',
    fontFamily: 'monospace'
  },
  distanceInfo: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px'
  },
  distanceSuccess: {
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    color: '#155724'
  },
  distanceError: {
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    color: '#721c24'
  },
  button: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s',
    marginBottom: '15px'
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
  tips: {
    backgroundColor: '#e8f5e9',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px'
  },
  tipTitle: {
    margin: '0 0 8px 0',
    fontWeight: '600',
    color: '#2e7d32'
  },
  tipList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#388e3c'
  },
  confirmedCard: {
    backgroundColor: '#d4edda',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    border: '2px solid #c3e6cb'
  },
  successIcon: {
    fontSize: '64px',
    color: '#28a745',
    marginBottom: '16px'
  },
  confirmedTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: '8px'
  },
  confirmedText: {
    fontSize: '16px',
    color: '#155724',
    margin: 0
  },
  cancelledCard: {
    backgroundColor: '#f8d7da',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    border: '2px solid #f5c6cb'
  },
  cancelIcon: {
    fontSize: '64px',
    color: '#dc3545',
    marginBottom: '16px'
  },
  cancelTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: '8px'
  },
  cancelText: {
    fontSize: '16px',
    color: '#721c24',
    margin: 0
  }
};

export default AttendanceConfirmation;