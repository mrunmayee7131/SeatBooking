const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSeats,
  bookSeat,
  putOnBreak,
  cancelBooking,
  getMyActiveBookings,
  getMyBookings,
  getSeatDetails
} = require('../controllers/seatController');

// Get seats for a location with availability
router.get('/:location', protect, getSeats);

// Get seat details
router.get('/details/:seatId', protect, getSeatDetails);

// Book a seat
router.post('/book', protect, bookSeat);

// Put booking on break
router.post('/break', protect, putOnBreak);

// Cancel booking
router.post('/cancel', protect, cancelBooking);

// Get user's active bookings
router.get('/my/bookings/active', protect, getMyActiveBookings);

// Get user's all bookings (history)
router.get('/my/bookings', protect, getMyBookings);

module.exports = router;