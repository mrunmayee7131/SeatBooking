import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome to MERN Auth App</h1>
        <p className="subtitle">A complete authentication system built with MongoDB, Express, React, and Node.js</p>
        
        <div className="features">
          <h2>Features</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>🔐 Secure Authentication</h3>
              <p>JWT-based authentication with bcrypt password hashing</p>
            </div>
            <div className="feature-card">
              <h3>👤 User Management</h3>
              <p>Complete user registration and login system</p>
            </div>
            <div className="feature-card">
              <h3>🗄️ MongoDB Database</h3>
              <p>Robust data storage with Mongoose ODM</p>
            </div>
            <div className="feature-card">
              <h3>⚛️ React Frontend</h3>
              <p>Modern, responsive user interface</p>
            </div>
          </div>
        </div>

        <div className="cta-buttons">
          <Link to="/login" className="btn btn-primary">Sign In</Link>
          <Link to="/signup" className="btn btn-secondary">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Home;