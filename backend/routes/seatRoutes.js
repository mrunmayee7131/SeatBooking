const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  getSeats, 
  bookSeat, 
  cancelBooking, 
  getMyBooking 
} = require('../controllers/seatController');

router.get('/:location', protect, getSeats);
router.post('/book', protect, bookSeat);
router.post('/cancel', protect, cancelBooking);
router.get('/my/booking', protect, getMyBooking);

module.exports = router;