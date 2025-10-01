import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AttendanceConfirmation from './AttendanceConfirmation';
import useLocationTracker from '../hooks/useLocationTracker';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, cancelled

  // Track location automatically
  useLocationTracker(60000); // Update every minute

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bookings/my-bookings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setBookings(response.data.bookings);
    } catch (err) {
      setError('Error fetching bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/bookings/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      fetchBookings();
      alert('Booking cancelled successfully');
    } catch (err) {
      alert('Error cancelling booking');
    }
  };

  const handleAttendanceConfirmed = (updatedBooking) => {
    setBookings(bookings.map(b => 
      b._id === updatedBooking._id ? updatedBooking : b
    ));
    setSelectedBooking(null);
  };

  const getStatusBadge = (booking) => {
    if (booking.status === 'cancelled') {
      return <span style={styles.badgeCancelled}>Cancelled</span>;
    }
    if (booking.attendanceConfirmed) {
      return <span style={styles.badgeConfirmed}>Confirmed</span>;
    }
    return <span style={styles.badgePending}>Pending Attendance</span>;
  };

  const needsAttendance = (booking) => {
    if (booking.status === 'cancelled' || booking.attendanceConfirmed) {
      return false;
    }

    const now = new Date();
    const bookingDate = new Date(booking.date);
    const [hours, minutes] = booking.startTime.split(':');
    bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const deadlineTime = new Date(bookingDate.getTime() + 20 * 60 * 1000);
    
    return now >= bookingDate && now <= deadlineTime;
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'pending') return booking.status === 'pending' && !booking.attendanceConfirmed;
    if (filter === 'confirmed') return booking.attendanceConfirmed;
    if (filter === 'cancelled') return booking.status === 'cancelled';
    return true;
  });

  if (loading) {
    return <div style={styles.loading}>Loading your bookings...</div>;
  }

  if (selectedBooking) {
    return (
      <div>
        <button 
          onClick={() => setSelectedBooking(null)}
          style={styles.backButton}
        >
          ← Back to Bookings
        </button>
        <AttendanceConfirmation 
          booking={selectedBooking}
          onAttendanceConfirmed={handleAttendanceConfirmed}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>My Bookings</h2>

      <div style={styles.filterContainer}>
        <button
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterButton,
            ...(filter === 'all' ? styles.filterButtonActive : {})
          }}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          style={{
            ...styles.filterButton,
            ...(filter === 'pending' ? styles.filterButtonActive : {})
          }}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          style={{
            ...styles.filterButton,
            ...(filter === 'confirmed' ? styles.filterButtonActive : {})
          }}
        >
          Confirmed
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          style={{
            ...styles.filterButton,
            ...(filter === 'cancelled' ? styles.filterButtonActive : {})
          }}
        >
          Cancelled
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {filteredBookings.length === 0 ? (
        <div style={styles.noBookings}>
          <p>No bookings found</p>
        </div>
      ) : (
        <div style={styles.bookingsList}>
          {filteredBookings.map((booking) => (
            <div key={booking._id} style={styles.bookingCard}>
              <div style={styles.bookingHeader}>
                <div style={styles.seatInfo}>
                  <h3 style={styles.seatNumber}>
                    Seat {booking.seat?.seatNumber}
                  </h3>
                  <p style={styles.floor}>Floor {booking.seat?.floor}</p>
                </div>
                {getStatusBadge(booking)}
              </div>

              <div style={styles.bookingDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>📅 Date:</span>
                  <span style={styles.detailValue}>
                    {new Date(booking.date).toLocaleDateString()}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>⏰ Time:</span>
                  <span style={styles.detailValue}>
                    {booking.startTime} - {booking.endTime}
                  </span>
                </div>
                {booking.attendanceConfirmed && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>✓ Confirmed At:</span>
                    <span style={styles.detailValue}>
                      {new Date(booking.attendanceConfirmedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {booking.cancellationReason && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Reason:</span>
                    <span style={styles.detailValue}>
                      {booking.cancellationReason}
                    </span>
                  </div>
                )}
              </div>

              <div style={styles.bookingActions}>
                {needsAttendance(booking) && (
                  <button
                    onClick={() => setSelectedBooking(booking)}
                    style={styles.attendButton}
                  >
                    Confirm Attendance
                  </button>
                )}
                {booking.status !== 'cancelled' && !booking.attendanceConfirmed && (
                  <button
                    onClick={() => handleCancelBooking(booking._id)}
                    style={styles.cancelButton}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '24px'
  },
  filterContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  error: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  noBookings: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    color: '#666',
    fontSize: '16px'
  },
  bookingsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  bookingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #eee'
  },
  seatInfo: {
    flex: 1
  },
  seatNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  floor: {
    fontSize: '14px',
    color: '#666',
    margin: '4px 0 0 0'
  },
  badgePending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  badgeConfirmed: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  badgeCancelled: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  bookingDetails: {
    marginBottom: '16px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px'
  },
  detailLabel: {
    color: '#666',
    fontWeight: '500'
  },
  detailValue: {
    color: '#333',
    fontWeight: '600'
  },
  bookingActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px'
  },
  attendButton: {
    flex: 1,
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  backButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '20px'
  }
};

export default MyBookings;