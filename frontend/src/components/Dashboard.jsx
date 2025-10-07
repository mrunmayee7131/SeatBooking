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
      const response = await axios.get('http://localhost:5000/api/seats', {
        headers: { Authorization: `Bearer ${token}` }
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

  const handleBookSeat = async (seatId) => {
    if (!selectedDate || !startTime || !endTime) {
      setError('Please select date and time before booking');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/bookings/book',
        {
          seatId,
          date: selectedDate,
          startTime,
          endTime
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Booking successful! Please confirm your attendance within 20 minutes.');
      navigate('/my-bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
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
              ⏰ Booking hours: 8:00 AM - 6:00 PM
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
                      backgroundColor: 
                        seat.status === 'available' ? '#4CAF50' :
                        seat.status === 'occupied' ? '#f44336' : '#9E9E9E'
                    }}
                    onClick={() => seat.status === 'available' && handleBookSeat(seat._id)}
                  >
                    <div style={styles.seatNumber}>{seat.seatNumber}</div>
                    <div style={styles.seatAmenities}>
                      {seat.hasCharging && <span style={styles.amenityIcon}>🔌</span>}
                      {seat.hasLamp && <span style={styles.amenityIcon}>💡</span>}
                    </div>
                    <div style={styles.seatStatus}>
                      {seat.status === 'available' ? 'Available' : 
                       seat.status === 'occupied' ? 'Occupied' : 'Maintenance'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!selectedLocation && (
          <div style={styles.instructions}>
            <h3>👆 Start by selecting a location above</h3>
            <p>Choose from Reading Hall 1, Reading Hall 2, or Main Library to view available seats.</p>
          </div>
        )}
      </div>
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
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
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
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
    color: '#856404',
    fontSize: '14px',
    textAlign: 'center'
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
    flexWrap: 'wrap'
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
  }
};

export default Dashboard;