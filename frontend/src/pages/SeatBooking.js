import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/SeatBooking.css';

const SeatBooking = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('Main Library');
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [myBooking, setMyBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchMyBooking();
      fetchSeats('Main Library');
    }
  }, [navigate]);

  const fetchSeats = async (loc) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/seats/${loc}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeats(res.data);
    } catch (err) {
      setError('Failed to fetch seats');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBooking = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/seats/my/booking', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyBooking(res.data.booking);
    } catch (err) {
      console.error('Failed to fetch booking');
    }
  };

  const handleLocationChange = (e) => {
    const newLocation = e.target.value;
    setLocation(newLocation);
    setSelectedSeat(null);
    fetchSeats(newLocation);
  };

  const handleSeatClick = (seat) => {
    if (!seat.isBooked) {
      setSelectedSeat(seat);
    }
  };

  const handleBookSeat = async () => {
    if (!selectedSeat) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/seats/book',
        { seatId: selectedSeat._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Seat booked successfully!');
      setSelectedSeat(null);
      fetchSeats(location);
      fetchMyBooking();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book seat');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!myBooking) return;

    if (!window.confirm('Are you sure you want to cancel your booking?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/seats/cancel',
        { seatId: myBooking._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Booking cancelled successfully!');
      setMyBooking(null);
      fetchSeats(location);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="seat-booking-container">
      <div className="booking-header">
        <div className="header-content">
          <h1>Library Seat Booking</h1>
          <div className="user-actions">
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </div>

      {myBooking && (
        <div className="current-booking">
          <h3>Your Current Booking</h3>
          <p>Location: <strong>{myBooking.location}</strong></p>
          <p>Seat Number: <strong>{myBooking.seatNumber}</strong></p>
          <button onClick={handleCancelBooking} className="btn-cancel" disabled={loading}>
            Cancel Booking
          </button>
        </div>
      )}

      <div className="location-selector">
        <label>Select Location:</label>
        <select value={location} onChange={handleLocationChange}>
          <option value="Main Library">Main Library</option>
          <option value="Reading Hall 1">Reading Hall 1</option>
          <option value="Reading Hall 2">Reading Hall 2</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="seats-info">
        <p><span className="seat-indicator available"></span> Available</p>
        <p><span className="seat-indicator booked"></span> Booked</p>
        <p><span className="seat-indicator selected"></span> Selected</p>
      </div>

      <div className="seats-grid">
        {loading ? (
          <p>Loading seats...</p>
        ) : (
          seats.map((seat) => (
            <div
              key={seat._id}
              className={`seat ${seat.isBooked ? 'booked' : 'available'} ${
                selectedSeat?._id === seat._id ? 'selected' : ''
              }`}
              onClick={() => handleSeatClick(seat)}
            >
              {seat.seatNumber}
            </div>
          ))
        )}
      </div>

      {selectedSeat && (
        <div className="booking-action">
          <div className="booking-details">
            <h3>Selected Seat</h3>
            <p>Location: <strong>{selectedSeat.location}</strong></p>
            <p>Seat Number: <strong>{selectedSeat.seatNumber}</strong></p>
            <div className="action-buttons">
              <button onClick={handleBookSeat} className="btn-book" disabled={loading}>
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button onClick={() => setSelectedSeat(null)} className="btn-cancel-selection">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatBooking;