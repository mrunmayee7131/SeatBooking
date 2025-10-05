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
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: ''
  });

  useEffect(() => {
    fetchSeats();
  }, [selectedLocation, formData.date, formData.startTime, formData.endTime]);

  const fetchSeats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/seats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeats(response.data.seats);
    } catch (err) {
      setError('Error fetching seats');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isSeatAvailable = (seat) => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      return true; // Show all seats if time not selected
    }

    // Check if seat has overlapping bookings
    // This is a simplified check - the backend will do the actual validation
    return seat.status === 'available';
  };

  const handleSeatClick = (seat) => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      alert('Please select date and time first');
      return;
    }

    if (!isSeatAvailable(seat)) {
      alert('This seat is not available for the selected time');
      return;
    }

    setSelectedSeat(seat);
    setShowConfirmation(true);
  };

  const handleConfirmBooking = async () => {
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
      navigate('/my-bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const renderSeatLayout = () => {
    const locationSeats = seats.filter(seat => seat.location === selectedLocation);
    
    if (selectedLocation === 'Main Library') {
      return renderMainLibraryLayout(locationSeats);
    } else if (selectedLocation === 'Reading Hall 1') {
      return renderReadingHall1Layout(locationSeats);
    } else if (selectedLocation === 'Reading Hall 2') {
      return renderReadingHall2Layout(locationSeats);
    }
  };

  const renderMainLibraryLayout = (locationSeats) => {
    const seatsByNumber = {};
    locationSeats.forEach(seat => {
      seatsByNumber[seat.seatNumber] = seat;
    });

    return (
      <div className="main-library-layout">
        <div className="library-entry">ENTRY</div>
        
        {/* Left section - 2 columns */}
        <div className="library-section library-left">
          {[0, 1].map(col => (
            <div key={col} className="library-column">
              {[...Array(8)].map((_, row) => {
                const seatNum = col * 8 + row + 1;
                const seat = seatsByNumber[seatNum];
                return seat ? (
                  <div
                    key={seat._id}
                    className={`seat ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                  >
                    {seat.seatNumber}
                  </div>
                ) : <div key={seatNum} className="seat empty"></div>;
              })}
            </div>
          ))}
        </div>

        {/* Middle gap */}
        <div className="library-gap"></div>

        {/* Right section - 2 columns */}
        <div className="library-section library-right">
          {[2, 3].map(col => (
            <div key={col} className="library-column">
              {[...Array(8)].map((_, row) => {
                const seatNum = col * 8 + row + 1;
                const seat = seatsByNumber[seatNum];
                return seat ? (
                  <div
                    key={seat._id}
                    className={`seat ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                  >
                    {seat.seatNumber}
                  </div>
                ) : <div key={seatNum} className="seat empty"></div>;
              })}
            </div>
          ))}
        </div>

        {/* Bottom section - 6 seats in 2 rows */}
        <div className="library-bottom">
          {[0, 1].map(row => (
            <div key={row} className="library-bottom-row">
              {[...Array(3)].map((_, col) => {
                const seatNum = 33 + row * 3 + col;
                const seat = seatsByNumber[seatNum];
                return seat ? (
                  <div
                    key={seat._id}
                    className={`seat ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                  >
                    {seat.seatNumber}
                  </div>
                ) : <div key={seatNum} className="seat empty"></div>;
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReadingHall1Layout = (locationSeats) => {
    const seatsByNumber = {};
    locationSeats.forEach(seat => {
      seatsByNumber[seat.seatNumber] = seat;
    });

    return (
      <div className="reading-hall-layout">
        <div className="hall-entry">ENTRY</div>
        
        {/* Main seating area - 10 rows x 6 columns */}
        <div className="hall-main-area">
          {[...Array(10)].map((_, row) => (
            <div key={row} className="hall-row">
              {[...Array(6)].map((_, col) => {
                const seatNum = row * 6 + col + 1;
                const seat = seatsByNumber[seatNum];
                return seat ? (
                  <div
                    key={seat._id}
                    className={`seat ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                  >
                    {seat.seatNumber}
                  </div>
                ) : <div key={seatNum} className="seat empty"></div>;
              })}
            </div>
          ))}
        </div>

        {/* Round tables on the right */}
        <div className="hall-round-tables">
          {[1, 2, 3].map(tableNum => (
            <div key={tableNum} className="round-table">
              {[...Array(5)].map((_, pos) => {
                const seatNum = 60 + (tableNum - 1) * 5 + pos + 1;
                const seat = seatsByNumber[seatNum];
                return seat ? (
                  <div
                    key={seat._id}
                    className={`seat round ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                    style={{
                      position: 'absolute',
                      left: `${50 + 40 * Math.cos((pos * 2 * Math.PI) / 5 - Math.PI / 2)}%`,
                      top: `${50 + 40 * Math.sin((pos * 2 * Math.PI) / 5 - Math.PI / 2)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {seat.seatNumber}
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReadingHall2Layout = (locationSeats) => {
    const seatsByNumber = {};
    locationSeats.forEach(seat => {
      seatsByNumber[seat.seatNumber] = seat;
    });

    return (
      <div className="reading-hall-2-layout">
        {/* Left section - 8 rows x 6 columns */}
        <div className="hall2-left-section">
          {[...Array(8)].map((_, row) => (
            <div key={row} className="hall-row">
              {[...Array(6)].map((_, col) => {
                const seatNum = row * 6 + col + 1;
                const seat = seatsByNumber[seatNum];
                return seat ? (
                  <div
                    key={seat._id}
                    className={`seat ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                  >
                    {seat.seatNumber}
                  </div>
                ) : <div key={seatNum} className="seat empty"></div>;
              })}
            </div>
          ))}
        </div>

        {/* Right section - 8 rows x 2 columns */}
        <div className="hall2-right-section">
          {[...Array(8)].map((_, row) => (
            <div key={row} className="hall-row">
              {[...Array(2)].map((_, col) => {
                const seatNum = 48 + row * 2 + col + 1;
                const seat = seatsByNumber[seatNum];
                return seat ? (
                  <div
                    key={seat._id}
                    className={`seat ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                  >
                    {seat.seatNumber}
                  </div>
                ) : <div key={seatNum} className="seat empty"></div>;
              })}
            </div>
          ))}
        </div>

        {/* Bottom section - 2 rows x 6 columns */}
        <div className="hall2-bottom-section">
          {[...Array(2)].map((_, row) => (
            <div key={row} className="hall-row">
              {[...Array(6)].map((_, col) => {
                const seatNum = 64 + row * 6 + col + 1;
                const seat = seatsByNumber[seatNum];
                return seat ? (
                  <div
                    key={seat._id}
                    className={`seat ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                  >
                    {seat.seatNumber}
                  </div>
                ) : <div key={seatNum} className="seat empty"></div>;
              })}
            </div>
          ))}
        </div>

        <div className="hall2-entry">ENTRY</div>
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

      {/* Controls Section */}
      <div className="booking-controls">
        <div className="location-selector">
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

        <div className="time-selector">
          <div className="time-input">
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

          <div className="time-input">
            <label>Start Time</label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="time-input">
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
      </div>

      {/* Seat Legend */}
      <div className="seats-info">
        <p><span className="seat-indicator available"></span> Available</p>
        <p><span className="seat-indicator booked"></span> Occupied</p>
        <p><span className="seat-indicator selected"></span> Selected</p>
        <p className="info-text">⚠️ Select date and time first, then click on a seat</p>
      </div>

      {/* Seat Layout */}
      <div className="seat-layout-container">
        {renderSeatLayout()}
      </div>

      {/* Confirmation Popup */}
      {showConfirmation && selectedSeat && (
        <div className="confirmation-overlay" onClick={() => setShowConfirmation(false)}>
          <div className="confirmation-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Booking</h3>
            <div className="confirmation-details">
              <p><strong>Location:</strong> {selectedLocation}</p>
              <p><strong>Seat Number:</strong> {selectedSeat.seatNumber}</p>
              <p><strong>Date:</strong> {new Date(formData.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {formData.startTime} - {formData.endTime}</p>
            </div>
            <div className="confirmation-warning">
              ⚠️ Remember: You must confirm your attendance within 20 minutes of the start time by being within 100 meters of the library.
            </div>
            <div className="confirmation-buttons">
              <button 
                onClick={handleConfirmBooking} 
                disabled={loading}
                className="btn-confirm"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button 
                onClick={() => {
                  setShowConfirmation(false);
                  setSelectedSeat(null);
                }}
                className="btn-cancel"
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