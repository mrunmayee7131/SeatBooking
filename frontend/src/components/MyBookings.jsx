import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AttendanceConfirmation from './AttendanceConfirmation';
import useLocationTracker from '../hooks/useLocationTracker';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filter, setFilter] = useState('all');
  
  // Break modal states
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedBookingForBreak, setSelectedBookingForBreak] = useState(null);
  const [breakStartTime, setBreakStartTime] = useState('');
  const [breakEndTime, setBreakEndTime] = useState('');

  // Track location automatically
  useLocationTracker(60000);

  useEffect(() => {
    fetchBookings();
    
    // Auto-refresh bookings every 30 seconds
    const interval = setInterval(() => {
      fetchBookings();
    }, 30000);

    return () => clearInterval(interval);
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

  const openBreakModal = (booking) => {
    setSelectedBookingForBreak(booking);
    setBreakStartTime('');
    setBreakEndTime('');
    setError('');
    setShowBreakModal(true);
  };

  const handleStartBreak = async () => {
    if (!breakStartTime || !breakEndTime) {
      setError('Please select break start and end times');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/bookings/start-break/${selectedBookingForBreak._id}`,
        {
          breakStartTime,
          breakEndTime
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Break started successfully!');
      setShowBreakModal(false);
      setSelectedBookingForBreak(null);
      setBreakStartTime('');
      setBreakEndTime('');
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Error starting break');
    }
  };

  const handleEndBreak = async (bookingId) => {
    if (!window.confirm('Are you sure you want to end your break?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/bookings/end-break/${bookingId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Break ended successfully!');
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Error ending break');
    }
  };

  const getStatusBadge = (booking) => {
    if (booking.status === 'cancelled') {
      return <span style={styles.badgeCancelled}>Cancelled</span>;
    }
    if (booking.status === 'on-break') {
      return <span style={styles.badgeOnBreak}>On Break</span>;
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
    if (filter === 'confirmed') return booking.attendanceConfirmed || booking.status === 'confirmed';
    if (filter === 'cancelled') return booking.status === 'cancelled';
    return true;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

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
      <div style={styles.header}>
        <h2 style={styles.title}>My Bookings</h2>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

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
                  <h3 style={styles.seatNumber}>Seat {booking.seat?.seatNumber}</h3>
                  <p style={styles.floor}>
                    Floor {booking.seat?.floor} - {booking.seat?.section} Section
                  </p>
                </div>
                {getStatusBadge(booking)}
              </div>

              <div style={styles.bookingDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Date:</span>
                  <span style={styles.detailValue}>{formatDate(booking.date)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Time:</span>
                  <span style={styles.detailValue}>
                    {booking.startTime} - {booking.endTime}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status:</span>
                  <span style={styles.detailValue}>
                    {booking.status === 'on-break' ? 'On Break' :
                     booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Current Break Display */}
              {booking.status === 'on-break' && booking.currentBreak && (
                <div style={styles.currentBreakBox}>
                  <div style={styles.breakIcon}>🟡</div>
                  <div>
                    <p style={styles.breakTitle}>Currently On Break</p>
                    <p style={styles.breakTime}>
                      {booking.currentBreak.startTime} - {booking.currentBreak.endTime}
                    </p>
                  </div>
                </div>
              )}

              {/* Break History */}
              {booking.breaks && booking.breaks.length > 0 && (
                <div style={styles.breakHistoryBox}>
                  <p style={styles.breakHistoryTitle}>Break History:</p>
                  {booking.breaks.map((brk, index) => (
                    <p key={index} style={styles.breakHistoryItem}>
                      Break {index + 1}: {brk.startTime} - {brk.endTime}
                    </p>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div style={styles.bookingActions}>
                {needsAttendance(booking) && (
                  <button
                    onClick={() => setSelectedBooking(booking)}
                    style={styles.attendButton}
                  >
                    Confirm Attendance
                  </button>
                )}

                {booking.status === 'confirmed' && booking.attendanceConfirmed && (
                  <button
                    onClick={() => openBreakModal(booking)}
                    style={styles.breakButton}
                  >
                    Take Break
                  </button>
                )}

                {booking.status === 'on-break' && (
                  <button
                    onClick={() => handleEndBreak(booking._id)}
                    style={styles.endBreakButton}
                  >
                    End Break
                  </button>
                )}

                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
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

      {/* Break Modal */}
      {showBreakModal && selectedBookingForBreak && (
        <div style={styles.modalOverlay} onClick={() => setShowBreakModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Take a Break</h3>
            
            <div style={styles.breakInfoBox}>
              <p style={styles.breakInfoTitle}>Break Guidelines:</p>
              <ul style={styles.breakInfoList}>
                <li>Minimum break duration: 20 minutes</li>
                <li>Break must be within your booking time</li>
                <li>Your seat will be marked as "On Break" (Yellow)</li>
                <li>You can return and end your break anytime</li>
              </ul>
            </div>

            <div style={styles.bookingSummary}>
              <p><strong>Seat:</strong> {selectedBookingForBreak.seat?.seatNumber}</p>
              <p><strong>Booking Time:</strong> {selectedBookingForBreak.startTime} - {selectedBookingForBreak.endTime}</p>
            </div>

            {selectedBookingForBreak.breaks && selectedBookingForBreak.breaks.length > 0 && (
              <div style={styles.existingBreaksBox}>
                <p style={styles.existingBreaksTitle}>Previous Breaks:</p>
                {selectedBookingForBreak.breaks.map((brk, index) => (
                  <p key={index} style={styles.existingBreakItem}>
                    Break {index + 1}: {brk.startTime} - {brk.endTime}
                  </p>
                ))}
              </div>
            )}

            <div style={styles.breakTimeInputs}>
              <div style={styles.timeInputGroup}>
                <label style={styles.inputLabel}>Break Start Time:</label>
                <input
                  type="time"
                  value={breakStartTime}
                  onChange={(e) => setBreakStartTime(e.target.value)}
                  min={selectedBookingForBreak.startTime}
                  max={selectedBookingForBreak.endTime}
                  style={styles.timeInput}
                />
              </div>
              <div style={styles.timeInputGroup}>
                <label style={styles.inputLabel}>Break End Time:</label>
                <input
                  type="time"
                  value={breakEndTime}
                  onChange={(e) => setBreakEndTime(e.target.value)}
                  min={breakStartTime}
                  max={selectedBookingForBreak.endTime}
                  style={styles.timeInput}
                />
              </div>
            </div>

            {error && <div style={styles.modalError}>{error}</div>}

            <div style={styles.modalActions}>
              <button onClick={handleStartBreak} style={styles.confirmButton}>
                Start Break
              </button>
              <button 
                onClick={() => {
                  setShowBreakModal(false);
                  setError('');
                }} 
                style={styles.cancelModalButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
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
    transition: 'background-color 0.2s'
  },
  filterContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
    color: 'white',
    borderColor: '#667eea'
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
  badgeOnBreak: {
    backgroundColor: '#fff3e0',
    color: '#f57c00',
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
  currentBreakBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fff3e0',
    borderRadius: '8px',
    marginBottom: '12px',
    borderLeft: '4px solid #ff9800'
  },
  breakIcon: {
    fontSize: '24px'
  },
  breakTitle: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#f57c00'
  },
  breakTime: {
    margin: 0,
    fontSize: '13px',
    color: '#666'
  },
  breakHistoryBox: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '12px'
  },
  breakHistoryTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666'
  },
  breakHistoryItem: {
    margin: '4px 0',
    fontSize: '13px',
    color: '#666',
    paddingLeft: '12px'
  },
  bookingActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    flexWrap: 'wrap'
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
  breakButton: {
    flex: 1,
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  endBreakButton: {
    flex: 1,
    backgroundColor: '#2196f3',
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333'
  },
  breakInfoBox: {
    backgroundColor: '#e3f2fd',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  breakInfoTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1976d2'
  },
  breakInfoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#666',
    fontSize: '13px'
  },
  bookingSummary: {
    backgroundColor: '#f5f5f5',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  existingBreaksBox: {
    backgroundColor: '#fff3e0',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  existingBreaksTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#e65100'
  },
  existingBreakItem: {
    margin: '4px 0',
    fontSize: '13px',
    color: '#666',
    paddingLeft: '12px',
    borderLeft: '2px solid #ff9800'
  },
  breakTimeInputs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px'
  },
  timeInputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  inputLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  timeInput: {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    transition: 'border-color 0.3s'
  },
  modalError: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  modalActions: {
    display: 'flex',
    gap: '12px'
  },
  confirmButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  cancelModalButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default MyBookings;