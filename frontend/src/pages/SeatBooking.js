import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/SeatBooking.css';

const SeatBooking = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('Main Library');
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [seatDetails, setSeatDetails] = useState(null);
  const [activeBookings, setActiveBookings] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSeatInfoModal, setShowSeatInfoModal] = useState(false);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [selectedBookingForBreak, setSelectedBookingForBreak] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchActiveBookings();
      
      const now = new Date();
      const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setStartTime(formatDateTimeLocal(now));
      setEndTime(formatDateTimeLocal(later));
    }
  }, [navigate]);

  useEffect(() => {
    if (startTime && endTime) {
      fetchSeats(location, startTime, endTime);
    }
  }, [location, startTime, endTime]);

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const validateBookingDuration = () => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = (end - start) / (1000 * 60);
    
    if (durationMinutes < 30) {
      setError('Minimum booking duration is 30 minutes');
      return false;
    }
    return true;
  };

  const fetchSeats = async (loc, start, end) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `http://localhost:5000/api/seats/${loc}?startTime=${start}&endTime=${end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Fetched seats:', res.data);
      setSeats(res.data);
    } catch (err) {
      setError('Failed to fetch seats');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeatDetails = async (seatId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `http://localhost:5000/api/seats/details/${seatId}?startTime=${startTime}&endTime=${endTime}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSeatDetails(res.data);
      setShowSeatInfoModal(true);
    } catch (err) {
      setError('Failed to fetch seat details');
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/seats/my/bookings/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveBookings(res.data.bookings);
    } catch (err) {
      console.error('Failed to fetch bookings');
    }
  };

  const fetchBookingHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/seats/my/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookingHistory(res.data.bookings);
      setShowHistoryModal(true);
    } catch (err) {
      setError('Failed to fetch booking history');
    }
  };

  const handleLocationChange = (e) => {
    const newLocation = e.target.value;
    setLocation(newLocation);
    setSelectedSeat(null);
  };

  const handleSeatClick = (seat) => {
    console.log('Seat clicked:', seat);
    if (seat.status === 'available' || seat.status === 'limited') {
      setSelectedSeat(seat);
      setShowBookingModal(true);
    } else {
      fetchSeatDetails(seat._id);
    }
  };

  const handleBookSeat = async () => {
    if (!selectedSeat || !startTime || !endTime) return;

    if (!validateBookingDuration()) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/seats/book',
        { 
          seatId: selectedSeat._id,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Seat booked successfully!');
      setSelectedSeat(null);
      setShowBookingModal(false);
      setError('');
      fetchSeats(location, startTime, endTime);
      fetchActiveBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book seat');
    } finally {
      setLoading(false);
    }
  };

  const handlePutOnBreak = async () => {
    if (!selectedBookingForBreak || !breakStart || !breakEnd) {
      setError('Please select break start and end time');
      return;
    }

    const start = new Date(breakStart);
    const end = new Date(breakEnd);
    const durationMinutes = (end - start) / (1000 * 60);
    
    if (durationMinutes < 30) {
      setError('Break duration must be at least 30 minutes');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/seats/break',
        { 
          bookingId: selectedBookingForBreak._id,
          breakStart: new Date(breakStart).toISOString(),
          breakEnd: new Date(breakEnd).toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Break added successfully! Others can now book your seat during this time.');
      setShowBreakModal(false);
      setBreakStart('');
      setBreakEnd('');
      setError('');
      fetchActiveBookings();
      fetchSeats(location, startTime, endTime);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add break');
    } finally {
      setLoading(false);
    }
  };

  const openBreakModal = (booking) => {
    setSelectedBookingForBreak(booking);
    setError('');
    const now = new Date();
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);
    
    const defaultBreakStart = now > bookingStart ? now : bookingStart;
    const defaultBreakEnd = new Date(defaultBreakStart.getTime() + 60 * 60 * 1000);
    
    if (defaultBreakEnd > bookingEnd) {
      setBreakEnd(formatDateTimeLocal(bookingEnd));
    } else {
      setBreakEnd(formatDateTimeLocal(defaultBreakEnd));
    }
    
    setBreakStart(formatDateTimeLocal(defaultBreakStart));
    setShowBreakModal(true);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/seats/cancel',
        { bookingId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Booking cancelled successfully!');
      fetchActiveBookings();
      fetchSeats(location, startTime, endTime);
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

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'active': return 'status-active';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      case 'expired': return 'status-expired';
      case 'on-break': return 'status-break';
      default: return '';
    }
  };

  return (
    <div className="seat-booking-container">
      <div className="booking-header">
        <div className="header-content">
          <h1>Library Seat Booking</h1>
          <div className="user-actions">
            <button onClick={fetchBookingHistory} className="btn-history" title="View Booking History">
              <span className="history-icon">📋</span>
              My Bookings
            </button>
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </div>

      {activeBookings.length > 0 && (
        <div className="active-bookings">
          <h3>Your Active Bookings</h3>
          {activeBookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-info">
                <p><strong>{booking.location}</strong> - Seat {booking.seatNumber}</p>
                <p className="booking-time">
                  {formatDateTime(booking.startTime)} → {formatDateTime(booking.endTime)}
                </p>
                {booking.breaks && booking.breaks.length > 0 && (
                  <div className="breaks-display">
                    <p className="break-info">
                      ⏸️ Break{booking.breaks.length > 1 ? 's' : ''} Taken: {booking.breaks.length}
                    </p>
                    {booking.breaks.map((brk, idx) => (
                      <p key={idx} className="break-detail">
                        • {formatDateTime(brk.breakStart)} to {formatDateTime(brk.breakEnd)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="booking-actions">
                <button 
                  onClick={() => openBreakModal(booking)} 
                  className="btn-break"
                  disabled={loading}
                >
                  Take Break
                </button>
                <button 
                  onClick={() => handleCancelBooking(booking._id)} 
                  className="btn-cancel-small"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="booking-controls">
        <div className="location-selector">
          <label>Select Location:</label>
          <select value={location} onChange={handleLocationChange}>
            <option value="Main Library">Main Library</option>
            <option value="Reading Hall 1">Reading Hall 1</option>
            <option value="Reading Hall 2">Reading Hall 2</option>
          </select>
        </div>

        <div className="time-selector">
          <div className="time-input">
            <label>Start Time:</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={formatDateTimeLocal(new Date())}
            />
          </div>
          <div className="time-input">
            <label>End Time (min 30 mins):</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime}
            />
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="seats-info">
        <p><span className="seat-indicator available"></span> Available</p>
        <p><span className="seat-indicator limited"></span> Limited (On Break)</p>
        <p><span className="seat-indicator booked"></span> Booked</p>
        <p className="info-text">💡 Click on any seat to see availability details</p>
      </div>

      <div className="seats-grid">
        {loading ? (
          <p>Loading seats...</p>
        ) : (
          seats.map((seat) => (
            <div
              key={seat._id}
              className={`seat ${seat.status || 'available'}`}
              onClick={() => handleSeatClick(seat)}
            >
              {seat.seatNumber}
            </div>
          ))
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSeat && (
        <div className="modal-overlay" onClick={() => { setShowBookingModal(false); setError(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Book Seat {selectedSeat.seatNumber}</h3>
            <p><strong>Location:</strong> {selectedSeat.location}</p>
            
            {selectedSeat.status === 'limited' && selectedSeat.breakSlots && selectedSeat.breakSlots.length > 0 && (
              <div className="limited-warning">
                <p>⚠️ <strong>Limited Availability - Seat on Break</strong></p>
                <p>This seat is available only during the following break period:</p>
                {selectedSeat.breakSlots.map((slot, idx) => (
                  <p key={idx} className="break-slot-info">
                    📅 {formatDateTime(slot.start)} → {formatDateTime(slot.end)}
                  </p>
                ))}
                <p style={{marginTop: '10px', fontSize: '0.9rem', color: '#856404'}}>
                  Your booking must be completely within this time range.
                </p>
              </div>
            )}

            <div className="booking-summary">
              <p><strong>Your Selected Time:</strong></p>
              <p>{formatDateTime(startTime)} → {formatDateTime(endTime)}</p>
            </div>

            {selectedSeat.availableSlots && selectedSeat.availableSlots.length > 0 && (
              <div className="available-info">
                <p><strong>Available Slots:</strong></p>
                {selectedSeat.availableSlots.map((slot, idx) => (
                  <p key={idx} className="slot-info">
                    {slot.start && slot.end ? 
                      `${formatDateTime(slot.start)} - ${formatDateTime(slot.end)} (${slot.duration})` :
                      `Available from ${formatDateTime(slot.start)}`
                    }
                  </p>
                ))}
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button onClick={handleBookSeat} className="btn-confirm" disabled={loading}>
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button onClick={() => { setShowBookingModal(false); setError(''); }} className="btn-cancel-modal">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seat Info Modal */}
      {showSeatInfoModal && seatDetails && (
        <div className="modal-overlay" onClick={() => setShowSeatInfoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Seat {seatDetails.seat.seatNumber} - Details</h3>
            <p><strong>Location:</strong> {seatDetails.seat.location}</p>

            <div className="seat-details">
              <h4>Availability:</h4>
              {seatDetails.availableSlots.length === 0 ? (
                <p className="fully-booked">This seat is fully booked for the selected time period.</p>
              ) : (
                <div className="availability-list">
                  {seatDetails.availableSlots.map((slot, idx) => (
                    <div key={idx} className="availability-slot">
                      <p><strong>Available Duration:</strong> {slot.duration}</p>
                      {slot.start && slot.end ? (
                        <p className="slot-time">
                          From: {formatDateTime(slot.start)}<br/>
                          To: {formatDateTime(slot.end)}
                        </p>
                      ) : (
                        <p className="slot-time">Available indefinitely after current bookings</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {seatDetails.currentBookings && seatDetails.currentBookings.length > 0 && (
                <div className="current-bookings-info">
                  <h4>Current Bookings:</h4>
                  {seatDetails.currentBookings.map((booking, idx) => (
                    <div key={idx} className="booking-info-item">
                      <p>
                        <strong>👤 {booking.userName}</strong>
                      </p>
                      <p>
                        {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
                        {booking.status === 'on-break' && <span className="break-badge">On Break - Available</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setShowSeatInfoModal(false)} className="btn-close-modal">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Break Modal */}
      {showBreakModal && selectedBookingForBreak && (
        <div className="modal-overlay" onClick={() => { setShowBreakModal(false); setError(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Take a Break</h3>
            <div className="booking-summary">
              <p><strong>Your Booking:</strong></p>
              <p>{selectedBookingForBreak.location} - Seat {selectedBookingForBreak.seatNumber}</p>
              <p className="booking-time">
                {formatDateTime(selectedBookingForBreak.startTime)} → {formatDateTime(selectedBookingForBreak.endTime)}
              </p>
            </div>

            {selectedBookingForBreak.breaks && selectedBookingForBreak.breaks.length > 0 && (
              <div className="existing-breaks">
                <h4>Existing Breaks:</h4>
                {selectedBookingForBreak.breaks.map((brk, idx) => (
                  <p key={idx} className="break-item">
                    {formatDateTime(brk.breakStart)} - {formatDateTime(brk.breakEnd)}
                  </p>
                ))}
              </div>
            )}

            <div className="break-time-inputs">
              <div className="time-input">
                <label>Break Start:</label>
                <input
                  type="datetime-local"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  min={formatDateTimeLocal(new Date(Math.max(new Date(), new Date(selectedBookingForBreak.startTime))))}
                  max={formatDateTimeLocal(new Date(selectedBookingForBreak.endTime))}
                />
              </div>
              <div className="time-input">
                <label>Break End (min 30 mins):</label>
                <input
                  type="datetime-local"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  min={breakStart}
                  max={formatDateTimeLocal(new Date(selectedBookingForBreak.endTime))}
                />
              </div>
            </div>

            <div className="break-info-box">
              <p>ℹ️ <strong>Break Rules:</strong></p>
              <ul>
                <li>Minimum break duration: 30 minutes</li>
                <li>Break must be within your booking time</li>
                <li>Others can book your seat during break time</li>
                <li>Your booking remains active</li>
                <li>Seat will show as yellow (limited availability) to others</li>
              </ul>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button onClick={handlePutOnBreak} className="btn-confirm" disabled={loading}>
                {loading ? 'Adding Break...' : 'Confirm Break'}
              </button>
              <button onClick={() => { setShowBreakModal(false); setError(''); }} className="btn-cancel-modal">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Booking History</h3>
            <div className="history-list">
              {bookingHistory.length === 0 ? (
                <p className="no-bookings">No bookings found</p>
              ) : (
                bookingHistory.map((booking) => (
                  <div key={booking._id} className="history-item">
                    <div className="history-details">
                      <p><strong>{booking.location}</strong> - Seat {booking.seatNumber}</p>
                      <p className="history-time">
                        {formatDateTime(booking.startTime)} → {formatDateTime(booking.endTime)}
                      </p>
                      <p className="history-booked">Booked: {formatDateTime(booking.bookedAt)}</p>
                      {booking.breaks && booking.breaks.length > 0 && (
                        <div className="history-breaks-section">
                          <p className="history-breaks">⏸️ Breaks taken: {booking.breaks.length}</p>
                          {booking.breaks.map((brk, idx) => (
                            <p key={idx} className="history-break-detail">
                              • {formatDateTime(brk.breakStart)} to {formatDateTime(brk.breakEnd)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowHistoryModal(false)} className="btn-close-modal">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatBooking;