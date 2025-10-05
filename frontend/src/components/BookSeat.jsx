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
  }, []);

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

  const getSeatsByLocation = () => {
    return seats.filter(seat => seat.location === selectedLocation);
  };

  const renderReadingHall1 = () => {
    const locationSeats = getSeatsByLocation();
    const seatMap = {};
    locationSeats.forEach(seat => {
      seatMap[seat.seatNumber] = seat;
    });

    return (
      <div className="rh1-container">
        <div className="rh1-entry">ENTRY</div>
        
        <div className="rh1-layout">
          {/* Main grid area - 10 rows x 6 columns */}
          <div className="rh1-main-grid">
            {[...Array(10)].map((_, row) => (
              <div key={row} className="rh1-row">
                {[...Array(6)].map((_, col) => {
                  const seatNum = row * 6 + col + 1;
                  const seat = seatMap[seatNum];
                  if (!seat) return <div key={col} className="seat-placeholder"></div>;
                  
                  return (
                    <div
                      key={seat._id}
                      className={`seat-item ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                      onClick={() => handleSeatClick(seat)}
                      title={`Seat ${seat.seatNumber}`}
                    >
                      {seat.seatNumber}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Round tables on the right */}
          <div className="rh1-round-tables">
            {[0, 1, 2].map(tableIdx => (
              <div key={tableIdx} className="round-table-container">
                <div className="round-table-circle">
                  {[0, 1, 2, 3, 4].map(seatIdx => {
                    const seatNum = 61 + tableIdx * 5 + seatIdx;
                    const seat = seatMap[seatNum];
                    if (!seat) return null;
                    
                    const angle = (seatIdx * 72 - 90) * (Math.PI / 180);
                    const radius = 70;
                    const x = 50 + radius * Math.cos(angle);
                    const y = 50 + radius * Math.sin(angle);
                    
                    return (
                      <div
                        key={seat._id}
                        className={`round-seat ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                        style={{
                          left: `${x}%`,
                          top: `${y}%`
                        }}
                        onClick={() => handleSeatClick(seat)}
                        title={`Seat ${seat.seatNumber}`}
                      >
                        {seat.seatNumber}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReadingHall2 = () => {
    const locationSeats = getSeatsByLocation();
    const seatMap = {};
    locationSeats.forEach(seat => {
      seatMap[seat.seatNumber] = seat;
    });

    return (
      <div className="rh2-container">
        <div className="rh2-layout">
          {/* Left section - 8 rows x 6 columns */}
          <div className="rh2-left">
            {[...Array(8)].map((_, row) => (
              <div key={row} className="rh2-row">
                {[...Array(6)].map((_, col) => {
                  const seatNum = row * 6 + col + 1;
                  const seat = seatMap[seatNum];
                  if (!seat) return <div key={col} className="seat-placeholder"></div>;
                  
                  return (
                    <div
                      key={seat._id}
                      className={`seat-item ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                      onClick={() => handleSeatClick(seat)}
                      title={`Seat ${seat.seatNumber}`}
                    >
                      {seat.seatNumber}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right section - 8 rows x 2 columns */}
          <div className="rh2-right">
            {[...Array(8)].map((_, row) => (
              <div key={row} className="rh2-row">
                {[...Array(2)].map((_, col) => {
                  const seatNum = 49 + row * 2 + col;
                  const seat = seatMap[seatNum];
                  if (!seat) return <div key={col} className="seat-placeholder"></div>;
                  
                  return (
                    <div
                      key={seat._id}
                      className={`seat-item ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                      onClick={() => handleSeatClick(seat)}
                      title={`Seat ${seat.seatNumber}`}
                    >
                      {seat.seatNumber}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section - 2 rows x 6 columns */}
        <div className="rh2-bottom">
          {[...Array(2)].map((_, row) => (
            <div key={row} className="rh2-row">
              {[...Array(6)].map((_, col) => {
                const seatNum = 65 + row * 6 + col;
                const seat = seatMap[seatNum];
                if (!seat) return <div key={col} className="seat-placeholder"></div>;
                
                return (
                  <div
                    key={seat._id}
                    className={`seat-item ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                    title={`Seat ${seat.seatNumber}`}
                  >
                    {seat.seatNumber}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="rh2-entry">ENTRY</div>
      </div>
    );
  };

  const renderMainLibrary = () => {
    const locationSeats = getSeatsByLocation();
    const seatMap = {};
    locationSeats.forEach(seat => {
      seatMap[seat.seatNumber] = seat;
    });

    return (
      <div className="ml-container">
        <div className="ml-entry">ENTRY</div>
        
        <div className="ml-layout">
          {/* Left section - 2 columns x 8 rows */}
          <div className="ml-left">
            {[0, 1].map(colIdx => (
              <div key={colIdx} className="ml-column">
                {[...Array(8)].map((_, row) => {
                  const seatNum = colIdx + row * 2 + 1;
                  const seat = seatMap[seatNum];
                  if (!seat) return <div key={row} className="seat-placeholder"></div>;
                  
                  return (
                    <div
                      key={seat._id}
                      className={`seat-item ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                      onClick={() => handleSeatClick(seat)}
                      title={`Seat ${seat.seatNumber}`}
                    >
                      {seat.seatNumber}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="ml-spacer"></div>

          {/* Right section - 2 columns x 8 rows */}
          <div className="ml-right">
            {[0, 1].map(colIdx => (
              <div key={colIdx} className="ml-column">
                {[...Array(8)].map((_, row) => {
                  const seatNum = 17 + colIdx + row * 2;
                  const seat = seatMap[seatNum];
                  if (!seat) return <div key={row} className="seat-placeholder"></div>;
                  
                  return (
                    <div
                      key={seat._id}
                      className={`seat-item ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                      onClick={() => handleSeatClick(seat)}
                      title={`Seat ${seat.seatNumber}`}
                    >
                      {seat.seatNumber}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section - 2 rows x 6 columns */}
        <div className="ml-bottom">
          {[...Array(2)].map((_, row) => (
            <div key={row} className="ml-row">
              {[...Array(6)].map((_, col) => {
                const seatNum = 33 + row * 6 + col;
                const seat = seatMap[seatNum];
                if (!seat) return <div key={col} className="seat-placeholder"></div>;
                
                return (
                  <div
                    key={seat._id}
                    className={`seat-item ${isSeatAvailable(seat) ? 'available' : 'occupied'} ${selectedSeat?._id === seat._id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                    title={`Seat ${seat.seatNumber}`}
                  >
                    {seat.seatNumber}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSeatLayout = () => {
    if (selectedLocation === 'Reading Hall 1') {
      return renderReadingHall1();
    } else if (selectedLocation === 'Reading Hall 2') {
      return renderReadingHall2();
    } else if (selectedLocation === 'Main Library') {
      return renderMainLibrary();
    }
  };

  return (
    <div className="book-seat-container">
      <button onClick={() => navigate('/dashboard')} className="back-btn">
        ← Back to Dashboard
      </button>

      <h2 className="page-title">Book a Seat</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Controls */}
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

      {/* Legend */}
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
        <p className="legend-warning">⚠️ Select date and time first, then click on a seat</p>
      </div>

      {/* Seat Layout */}
      <div className="seat-layout-wrapper">
        {renderSeatLayout()}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedSeat && (
        <div className="modal-overlay" onClick={() => setShowConfirmation(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Booking</h3>
            <div className="modal-details">
              <p><strong>Location:</strong> {selectedLocation}</p>
              <p><strong>Seat Number:</strong> {selectedSeat.seatNumber}</p>
              <p><strong>Date:</strong> {new Date(formData.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {formData.startTime} - {formData.endTime}</p>
            </div>
            <div className="modal-warning">
              ⚠️ Remember: You must confirm your attendance within 20 minutes of the start time by being within 100 meters of the library.
            </div>
            <div className="modal-actions">
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
                className="btn-cancel-modal"
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