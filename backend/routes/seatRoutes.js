const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  getSeats, 
  bookSeat, 
  cancelBooking, 
  getMyActiveBookings,
  getMyBookings,
  putOnBreak,
  getSeatDetails
} = require('../controllers/seatController');

router.get('/:location', protect, getSeats);
router.get('/details/:seatId', protect, getSeatDetails);
router.post('/book', protect, bookSeat);
router.post('/break', protect, putOnBreak);
router.post('/cancel', protect, cancelBooking);
router.get('/my/bookings', protect, getMyBookings);
router.get('/my/bookings/active', protect, getMyActiveBookings);

module.exports = router;