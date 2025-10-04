import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import BookSeat from './components/BookSeat';
import MyBookings from './components/MyBookings';
import './App.css';

function App() {
  // Check if user is authenticated
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  // Private route wrapper
  const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          
          {/* Keep old routes for compatibility */}
          <Route path="/signup" element={<Navigate to="/register" />} />
          <Route path="/seats" element={<Navigate to="/dashboard" />} />
          
          {/* Private routes */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/book-seat" 
            element={
              <PrivateRoute>
                <BookSeat />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/my-bookings" 
            element={
              <PrivateRoute>
                <MyBookings />
              </PrivateRoute>
            } 
          />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;