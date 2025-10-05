import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/SeatBooking.css';

const BookSeat = () => {
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Reading Hall 1');
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: ''
  });

  useEffect(() => {
    fetchSeats();
  }, [selectedLocation]);

  const fetchSeats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/seats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeats(response.data.seats || []);
      setError('');
    } catch (err) {
      setError('Error fetching seats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getSeatsByLocation = () => {
    return seats.filter(seat => seat.location === selectedLocation);
  };

  const handleSeatClick = (seat) => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      alert('Please select date and time first');
      return;
    }

    if (seat.status !== 'available') {
      alert('This seat is not available');
      return;
    }

    setSelectedSeat(seat);
    setShowModal(true);
  };

  const handleBookSeat = async () => {
    if (!selectedSeat) return;

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/bookings/book',
        {
          seatId: selectedSeat._id,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Seat booked successfully! Remember to confirm attendance within 20 minutes.');
      setShowModal(false);
      setSelectedSeat(null);
      navigate('/my-bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const renderSeats = () => {
    const locationSeats = getSeatsByLocation();
    
    if (locationSeats.length === 0) {
      return <div className="no-seats">No seats available for this location</div>;
    }

    // Create 10 rows of 5 seats each for a total of 50 seats
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const rowSeats = [];
      for (let j = 0; j < 5; j++) {
        const seatIndex = i * 5 + j;
        if (seatIndex < locationSeats.length) {
          rowSeats.push(locationSeats[seatIndex]);
        }
      }
      rows.push(rowSeats);
    }

    return (
      <div className="seat-grid">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="seat-row">
            {row.map((seat) => (
              <div
                key={seat._id}
                className={`seat-item ${seat.status} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                onClick={() => handleSeatClick(seat)}
                title={`Seat ${seat.seatNumber} - ${seat.status}`}
              >
                {seat.seatNumber}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="book-seat-container">
      <button onClick={() => navigate('/dashboard')} className="back-btn">
        ← Back to Dashboard
      </button>

      <h2 className="page-title">Book a Seat</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="booking-controls">
        <div className="control-group">
          <label>Select Location</label>
          <select
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              setSelectedSeat(null);
            }}
          >
            <option value="Reading Hall 1">Reading Hall 1</option>
            <option value="Reading Hall 2">Reading Hall 2</option>
            <option value="Main Library">Main Library</option>
          </select>
        </div>

        <div className="control-group">
          <label>Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="control-group">
          <label>Start Time</label>
          <input
            type="time"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="control-group">
          <label>End Time</label>
          <input
            type="time"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="seat-legend">
        <div className="legend-item">
          <div className="legend-box available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-box occupied"></div>
          <span>Occupied</span>
        </div>
        <div className="legend-item">
          <div className="legend-box selected"></div>
          <span>Selected</span>
        </div>
      </div>

      <div className="seat-layout-wrapper">
        <h3>{selectedLocation}</h3>
        {loading ? (
          <div className="loading">Loading seats...</div>
        ) : (
          renderSeats()
        )}
      </div>

      {showModal && selectedSeat && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Booking</h3>
            <div className="seat-info">
              <p><strong>Location:</strong> {selectedSeat.location}</p>
              <p><strong>Seat Number:</strong> {selectedSeat.seatNumber}</p>
              <p><strong>Date:</strong> {formData.date}</p>
              <p><strong>Time:</strong> {formData.startTime} - {formData.endTime}</p>
              <p><strong>Status:</strong> {selectedSeat.status}</p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={handleBookSeat} 
                disabled={loading}
                className="confirm-btn"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button 
                onClick={() => setShowModal(false)} 
                className="cancel-btn"
                disabled={loading}
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

export default BookSeat;