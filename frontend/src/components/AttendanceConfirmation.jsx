import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AttendanceConfirmation = ({ booking, onAttendanceConfirmed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

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

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // First update user location
          await axios.post(
            'http://localhost:5000/api/users/update-location',
            { latitude, longitude },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );

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
            onAttendanceConfirmed(response.data.booking);
          } else {
            setError(response.data.message);
          }
        } catch (err) {
          setError(err.response?.data?.message || 'Error confirming attendance');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError('Unable to get your location. Please enable location services.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
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

        {distance !== null && (
          <div style={styles.distanceInfo}>
            Distance from library: {distance} meters
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
          {loading ? 'Confirming...' : 'Confirm I\'m Here'}
        </button>
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
    lineHeight: '1.5'
  },
  distanceInfo: {
    padding: '12px',
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    borderRadius: '8px',
    color: '#155724',
    fontSize: '14px',
    marginBottom: '20px',
    textAlign: 'center',
    fontWeight: '600'
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
  confirmedCard: {
    backgroundColor: '#d4edda',
    border: '2px solid #28a745',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '20px auto'
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
    marginBottom: '12px'
  },
  confirmedText: {
    fontSize: '16px',
    color: '#155724'
  },
  cancelledCard: {
    backgroundColor: '#f8d7da',
    border: '2px solid #dc3545',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '20px auto'
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
    marginBottom: '12px'
  },
  cancelText: {
    fontSize: '16px',
    color: '#721c24'
  }
};

export default AttendanceConfirmation;