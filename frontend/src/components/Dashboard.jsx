import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [seats, setSeats] = useState([]);
  const [filteredSeats, setFilteredSeats] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

  // Location configurations
  const locations = [
    {
      id: 'reading-hall-1',
      name: 'Reading Hall 1',
      section: 'A',
      floor: 1,
      icon: '📚',
      color: '#4CAF50',
      description: 'Ground Floor - Quiet Study Area'
    },
    {
      id: 'reading-hall-2',
      name: 'Reading Hall 2',
      section: 'B',
      floor: 1,
      icon: '📖',
      color: '#2196F3',
      description: 'Ground Floor - Group Study Area'
    },
    {
      id: 'main-library',
      name: 'Main Library',
      section: 'C',
      floor: 2,
      icon: '🏛️',
      color: '#FF9800',
      description: 'First Floor - Premium Seating'
    }
  ];

  useEffect(() => {
    fetchUserProfile();
    fetchSeats();
    // Set default date to today
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    filterSeats();
  }, [selectedLocation, seats, selectedDate, startTime, endTime]);

  // Auto-refresh seats every 30 seconds to update break status
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedLocation && selectedDate && startTime && endTime) {
        fetchSeats();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedLocation, selectedDate, startTime, endTime]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (err) {
      console.error('Error fetching profile:', err);
      navigate('/login');
    }
  };

  const fetchSeats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      
      if (selectedLocation) {
        const location = locations.find(loc => loc.id === selectedLocation);
        if (location) {
          params.floor = location.floor;
          params.section = location.section;
        }
      }

      // Add date and time params for break status
      if (selectedDate && startTime && endTime) {
        params.date = selectedDate;
        params.startTime = startTime;
        params.endTime = endTime;
      }

      const response = await axios.get('http://localhost:5000/api/seats', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setSeats(response.data.seats);
      setLoading(false);
    } catch (err) {
      setError('Error fetching seats');
      setLoading(false);
    }
  };

  const filterSeats = () => {
    if (!selectedLocation) {
      setFilteredSeats([]);
      return;
    }

    const location = locations.find(loc => loc.id === selectedLocation);
    if (!location) return;

    let filtered = seats.filter(
      seat => seat.section === location.section && seat.floor === location.floor
    );

    setFilteredSeats(filtered);
  };

  const handleLocationSelect = (locationId) => {
    setSelectedLocation(locationId);
    setError('');
  };

  const getSeatBackgroundColor = (seat) => {
    // ENHANCED: Seat is available during break time
    if (seat.availableInBreak) {
      return '#FFC107'; // Yellow - available during break
    }
    // Seat is on break but not available for current time slot
    if (seat.isOnBreak) {
      return '#FF9800'; // Orange - on break but not bookable
    }
    if (seat.isBooked || seat.status === 'occupied') {
      return '#f44336'; // Red for occupied
    }
    if (seat.status === 'maintenance') {
      return '#9E9E9E'; // Gray for maintenance
    }
    return '#4CAF50'; // Green for available
  };

  const getSeatCursor = (seat) => {
    if (seat.availableInBreak || (!seat.isBooked && seat.status === 'available')) {
      return 'pointer';
    }
    return 'not-allowed';
  };

  const getSeatTitle = (seat) => {
    if (seat.availableInBreak) {
      return `Available during ${seat.breakTimeInfo?.ownerName || 'user'}'s break (${seat.breakTimeInfo?.breakStart} - ${seat.breakTimeInfo?.breakEnd}). Click to book!`;
    }
    if (seat.isOnBreak) {
      return 'Seat is on break (your selected time is not strictly within the break period)';
    }
    if (seat.isBooked) {
      return 'Seat is occupied';
    }
    if (seat.status === 'maintenance') {
      return 'Under maintenance';
    }
    return 'Click to book';
  };

  const handleBookSeat = async (seatId) => {
    if (!selectedDate || !startTime || !endTime) {
      setError('Please select date and time before booking');
      return;
    }

    if (startTime >= endTime && timeToMinutes(endTime) > timeToMinutes('01:00')) {
      setError('End time must be after start time');
      return;
    }

    // Get seat details for confirmation
    const seat = filteredSeats.find(s => s._id === seatId);
    const seatNumber = seat ? seat.seatNumber : 'Unknown';
    
    // Store booking details and show modal
    setPendingBooking({
      seatId,
      seatNumber,
      date: selectedDate,
      startTime,
      endTime,
      isBreakBooking: seat.availableInBreak || false,
      breakInfo: seat.breakTimeInfo || null
    });
    setShowConfirmModal(true);
  };

  const confirmBooking = async () => {
    if (!pendingBooking) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/bookings/book',
        {
          seatId: pendingBooking.seatId,
          date: pendingBooking.date,
          startTime: pendingBooking.startTime,
          endTime: pendingBooking.endTime
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
       console.log('response',response);
      setShowConfirmModal(false);
      setPendingBooking(null);
      
      if (pendingBooking.isBreakBooking) {
        alert(`✅ Break-time booking successful! You can use Seat ${pendingBooking.seatNumber} from ${pendingBooking.startTime} to ${pendingBooking.endTime} during ${pendingBooking.breakInfo?.ownerName || 'another user'}'s break. Please confirm your attendance within 20 minutes.`);
      } else {
        alert('Booking successful! Please confirm your attendance within 20 minutes.');
      }
      
      navigate('/my-bookings');
    } catch (err) {
      setShowConfirmModal(false);
      setPendingBooking(null);
      setError(err.response?.data?.message || 'Booking failed');
    }
  };

  const cancelBooking = () => {
    setShowConfirmModal(false);
    setPendingBooking(null);
  };

  // Helper function to convert time to minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Library Seat Booking</h1>
            {user && <p style={styles.welcomeText}>Welcome, {user.name}!</p>}
          </div>
          <div style={styles.headerActions}>
            <button onClick={() => navigate('/my-bookings')} style={styles.btnBookings}>
              📋 My Bookings
            </button>
            <button onClick={handleLogout} style={styles.btnLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Location Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Select Location</h2>
          <div style={styles.locationGrid}>
            {locations.map((location) => (
              <div
                key={location.id}
                style={{
                  ...styles.locationCard,
                  ...(selectedLocation === location.id ? styles.locationCardSelected : {}),
                  borderColor: location.color
                }}
                onClick={() => handleLocationSelect(location.id)}
              >
                <div style={{ ...styles.locationIcon, backgroundColor: location.color }}>
                  {location.icon}
                </div>
                <h3 style={styles.locationName}>{location.name}</h3>
                <p style={styles.locationDescription}>{location.description}</p>
                {selectedLocation === location.id && (
                  <div style={styles.selectedBadge}>✓ Selected</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        {selectedLocation && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Select Date & Time</h2>
            <div style={styles.timeControls}>
              <div style={styles.timeInput}>
                <label style={styles.label}>Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={styles.input}
                />
              </div>
              <div style={styles.timeInput}>
                <label style={styles.label}>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.timeInput}>
                <label style={styles.label}>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.timeNote}>
              ⏰ 24/7 booking available. You can book seats anytime!
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Seats Display */}
        {selectedLocation && selectedDate && startTime && endTime && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              Available Seats - {locations.find(l => l.id === selectedLocation)?.name}
            </h2>
            
            {/* Legend */}
            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendBox, backgroundColor: '#4CAF50' }}></div>
                <span>Available</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendBox, backgroundColor: '#FFC107' }}></div>
                <span>Available (Break Time) - Click to book!</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendBox, backgroundColor: '#FF9800' }}></div>
                <span>On Break (Not available for your time)</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendBox, backgroundColor: '#f44336' }}></div>
                <span>Occupied</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendBox, backgroundColor: '#9E9E9E' }}></div>
                <span>Maintenance</span>
              </div>
            </div>

            <div style={styles.seatsGrid}>
              {filteredSeats.length === 0 ? (
                <p style={styles.noSeats}>No seats available in this location</p>
              ) : (
                filteredSeats.map((seat) => (
                  <div
                    key={seat._id}
                    style={{
                      ...styles.seatCard,
                      backgroundColor: getSeatBackgroundColor(seat),
                      cursor: getSeatCursor(seat)
                    }}
                    onClick={() => {
                      if (seat.availableInBreak || (!seat.isBooked && seat.status === 'available')) {
                        handleBookSeat(seat._id);
                      }
                    }}
                    title={getSeatTitle(seat)}
                  >
                    <div style={styles.seatNumber}>{seat.seatNumber}</div>
                    <div style={styles.seatAmenities}>
                      {seat.hasCharging && <span style={styles.amenityIcon}>🔌</span>}
                      {seat.hasLamp && <span style={styles.amenityIcon}>💡</span>}
                    </div>
                    {seat.availableInBreak && (
                      <div style={{ fontSize: '20px', marginTop: '4px' }}>⏰</div>
                    )}
                    <div style={styles.seatStatus}>
                      {seat.availableInBreak ? 'Break Time' :
                       seat.isOnBreak ? 'On Break' :
                       seat.status === 'available' ? 'Available' : 
                       seat.status === 'occupied' ? 'Occupied' : 'Maintenance'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {!selectedLocation && (
          <div style={styles.instructions}>
            <h3>📍 Please select a location to view available seats</h3>
            <p>Choose from the available reading halls and library sections above</p>
          </div>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      {showConfirmModal && pendingBooking && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {pendingBooking.isBreakBooking ? '⏰ Confirm Break Time Booking' : 'Confirm Booking'}
              </h2>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.bookingDetail}>
                <span style={styles.detailLabel}>Seat Number:</span>
                <span style={styles.detailValue}>{pendingBooking.seatNumber}</span>
              </div>
              <div style={styles.bookingDetail}>
                <span style={styles.detailLabel}>Date:</span>
                <span style={styles.detailValue}>
                  {new Date(pendingBooking.date).toLocaleDateString()}
                </span>
              </div>
              <div style={styles.bookingDetail}>
                <span style={styles.detailLabel}>Time:</span>
                <span style={styles.detailValue}>
                  {pendingBooking.startTime} - {pendingBooking.endTime}
                </span>
              </div>

              {pendingBooking.isBreakBooking && pendingBooking.breakInfo && (
                <div style={styles.breakBookingInfo}>
                  <div style={styles.breakInfoIcon}>⏰</div>
                  <div>
                    <strong style={{ fontSize: '16px', color: '#e65100' }}>Break Time Booking</strong>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', lineHeight: '1.5' }}>
                      This seat is on break from <strong>{pendingBooking.breakInfo.breakStart}</strong> to <strong>{pendingBooking.breakInfo.breakEnd}</strong>.
                      You can use it during this time period.
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#666' }}>
                      <strong>Owner:</strong> {pendingBooking.breakInfo.ownerName}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#2e7d32', fontWeight: 'bold' }}>
                      ✅ Your booking time is strictly within the break period
                    </p>
                  </div>
                </div>
              )}

              <div style={styles.warningBox}>
                <div style={styles.warningIcon}>⚠️</div>
                <div style={styles.warningText}>
                  <strong>Important:</strong> You must confirm your attendance within 20 minutes 
                  of your booking start time, or your booking will be automatically cancelled.
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button 
                onClick={cancelBooking}
                style={styles.btnCancel}
              >
                Cancel
              </button>
              <button 
                onClick={confirmBooking}
                style={styles.btnConfirm}
              >
                Confirm Booking
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
    minHeight: '100vh',
    backgroundColor: '#f5f7fa'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: '#666'
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '30px 20px',
    color: 'white',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 'bold'
  },
  welcomeText: {
    margin: '8px 0 0 0',
    fontSize: '16px',
    opacity: 0.9
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  btnBookings: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '2px solid white',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  btnLogout: {
    backgroundColor: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px'
  },
  locationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '30px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '3px solid transparent',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    position: 'relative'
  },
  locationCardSelected: {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
  },
  locationIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    margin: '0 auto 20px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
  },
  locationName: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px'
  },
  locationDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  selectedBadge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  timeControls: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  timeInput: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  input: {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    transition: 'border-color 0.3s'
  },
  timeNote: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#e3f2fd',
    border: '1px solid #2196F3',
    borderRadius: '8px',
    color: '#1565c0',
    fontSize: '14px',
    textAlign: 'center',
    gridColumn: '1 / -1'
  },
  error: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  legend: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#666'
  },
  legendBox: {
    width: '30px',
    height: '30px',
    borderRadius: '6px'
  },
  seatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '15px'
  },
  noSeats: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    fontSize: '16px',
    gridColumn: '1 / -1'
  },
  seatCard: {
    aspectRatio: '1',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    color: 'white',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '10px'
  },
  seatNumber: {
    fontSize: '20px',
    marginBottom: '5px'
  },
  seatAmenities: {
    display: 'flex',
    gap: '5px',
    fontSize: '14px',
    marginBottom: '5px'
  },
  amenityIcon: {
    fontSize: '16px'
  },
  seatStatus: {
    fontSize: '10px',
    opacity: 0.9,
    textTransform: 'uppercase'
  },
  instructions: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
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
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden'
  },
  modalHeader: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '25px',
    color: 'white'
  },
  modalTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold'
  },
  modalBody: {
    padding: '30px'
  },
  bookingDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    marginBottom: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    borderLeft: '4px solid #667eea'
  },
  detailLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  detailValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#667eea'
  },
  breakBookingInfo: {
    display: 'flex',
    gap: '15px',
    padding: '20px',
    marginTop: '20px',
    backgroundColor: '#fff3e0',
    border: '2px solid #ff9800',
    borderRadius: '12px'
  },
  breakInfoIcon: {
    fontSize: '28px',
    flexShrink: 0
  },
  warningBox: {
    display: 'flex',
    gap: '15px',
    padding: '20px',
    marginTop: '20px',
    backgroundColor: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '12px'
  },
  warningIcon: {
    fontSize: '28px',
    flexShrink: 0
  },
  warningText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#856404'
  },
  modalFooter: {
    display: 'flex',
    gap: '15px',
    padding: '20px 30px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e0e0e0'
  },
  btnCancel: {
    flex: 1,
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    border: '2px solid #6c757d',
    backgroundColor: 'white',
    color: '#6c757d',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  btnConfirm: {
    flex: 1,
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px  6px rgba(0,0,0,0.1)'
  }
};

export default Dashboard