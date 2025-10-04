import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useLocationTracker from '../hooks/useLocationTracker';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Automatically track location
  useLocationTracker(60000); // Update every minute

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Library Seat Booking</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      {user && (
        <div style={styles.welcomeCard}>
          <h2>Welcome, {user.name}!</h2>
          <p>Roll Number: {user.rollNumber}</p>
          <p>Department: {user.department}</p>
        </div>
      )}

      <div style={styles.actionsGrid}>
        <Link to="/book-seat" style={styles.actionCard}>
          <div style={styles.icon}>🪑</div>
          <h3>Book a Seat</h3>
          <p>Reserve your library seat</p>
        </Link>

        <Link to="/my-bookings" style={styles.actionCard}>
          <div style={styles.icon}>📋</div>
          <h3>My Bookings</h3>
          <p>View and manage bookings</p>
        </Link>
      </div>

      <div style={styles.infoBox}>
        <h3>📍 Important Information</h3>
        <ul>
          <li>You must reach your seat within 20 minutes of booking start time</li>
          <li>Confirm your attendance by being within 100 meters of the library</li>
          <li>Your location is automatically tracked for attendance verification</li>
          <li>Bookings will be auto-cancelled if attendance is not confirmed</li>
        </ul>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  title: {
    fontSize: '28px',
    color: '#333',
    margin: 0
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  welcomeCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    textDecoration: 'none',
    color: '#333',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  icon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    border: '1px solid #b3d9ff',
    borderRadius: '12px',
    padding: '20px'
  }
};

export default Dashboard;