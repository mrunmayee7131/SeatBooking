import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BookSeat = () => {
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    seatId: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/bookings/book',
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Seat booked successfully! Remember to confirm attendance within 20 minutes.');
      navigate('/my-bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
        ← Back to Dashboard
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>Book a Seat</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Seat</label>
            <select
              name="seatId"
              value={formData.seatId}
              onChange={handleChange}
              required
              style={styles.select}
            >
              <option value="">Choose a seat</option>
              {seats.map(seat => (
                <option key={seat._id} value={seat._id}>
                  Seat {seat.seatNumber} - Floor {seat.floor} - {seat.status}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              min={new Date().toISOString().split('T')[0]}
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Time</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>End Time</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.warning}>
            ⚠️ Remember: You must confirm your attendance within 20 minutes of the start time by being within 100 meters of the library.
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Booking...' : 'Book Seat'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  backBtn: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '600px',
    margin: '0 auto',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  title: {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  row: {
    display: 'flex',
    gap: '20px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#333'
  },
  input: {
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px'
  },
  select: {
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px'
  },
  warning: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '15px',
    borderRadius: '8px',
    color: '#856404',
    fontSize: '14px'
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  error: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px'
  }
};

export default BookSeat;