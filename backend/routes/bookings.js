const express = require('express');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { checkAttendance, scheduleAttendanceCheck } = require('../services/attendanceChecker');

const router = express.Router();

// Create a new booking
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const { seatId, date, startTime, endTime } = req.body;

    if (!seatId || !date || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    // Check if seat exists and is available
    const seat = await Seat.findById(seatId);
    if (!seat) {
      return res.status(404).json({ 
        message: 'Seat not found' 
      });
    }

    if (seat.status !== 'available') {
      return res.status(400).json({ 
        message: 'Seat is not available' 
      });
    }

    // Check for overlapping bookings
    const bookingDate = new Date(date);
    const dayStart = new Date(bookingDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existingBooking = await Booking.findOne({
      seat: seatId,
      date: {
        $gte: dayStart,
        $lt: dayEnd
      },
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (existingBooking) {
      return res.status(400).json({ 
        message: 'Seat is already booked for this time slot' 
      });
    }

    // Create booking
    const booking = new Booking({
      user: req.userId,
      seat: seatId,
      date: bookingDate,
      startTime,
      endTime,
      status: 'pending'
    });

    await booking.save();

    // Update seat status using findByIdAndUpdate
    await Seat.findByIdAndUpdate(
      seatId,
      { $set: { status: 'occupied' } },
      { runValidators: false }
    );

    // Schedule attendance check (20 minutes after start time)
    const scheduled = scheduleAttendanceCheck(booking);
    if (scheduled) {
      booking.autoCheckScheduled = true;
      await booking.save();
    }

    const populatedBooking = await Booking.findById(booking._id).populate('seat');

    res.status(201).json({
      message: 'Booking created successfully. Please reach your seat within 20 minutes.',
      booking: populatedBooking,
      requiresAttendance: true,
      attendanceDeadline: '20 minutes from start time'
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ 
      message: 'Error creating booking',
      error: error.message 
    });
  }
});

// Confirm attendance for a booking
router.post('/confirm-attendance/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Location coordinates are required' 
      });
    }

    // Update user location first
    const user = await User.findById(req.userId);
    if (user) {
      await User.findByIdAndUpdate(
        req.userId,
        {
          $set: {
            'lastKnownLocation.latitude': parseFloat(latitude),
            'lastKnownLocation.longitude': parseFloat(longitude),
            'lastKnownLocation.timestamp': new Date()
          }
        },
        { runValidators: false }
      );
    }

    // Check attendance
    const result = await checkAttendance(bookingId);

    if (result.success) {
      res.json({
        message: result.message,
        booking: result.booking,
        attendanceConfirmed: true
      });
    } else {
      res.status(400).json({
        message: result.message,
        attendanceConfirmed: false
      });
    }
  } catch (error) {
    console.error('Attendance confirmation error:', error);
    res.status(500).json({ 
      message: 'Error confirming attendance',
      error: error.message 
    });
  }
});

// Get user bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
      .populate('seat')
      .sort({ date: -1, startTime: -1 });

    res.json({ bookings });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ 
      message: 'Error fetching bookings' 
    });
  }
});

// Get booking by ID
router.get('/:bookingId', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('seat user');

    if (!booking) {
      return res.status(404).json({ 
        message: 'Booking not found' 
      });
    }

    // Check if user owns this booking
    if (booking.user._id.toString() !== req.userId) {
      return res.status(403).json({ 
        message: 'Unauthorized access' 
      });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Fetch booking error:', error);
    res.status(500).json({ 
      message: 'Error fetching booking' 
    });
  }
});

// Cancel booking
router.delete('/:bookingId', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ 
        message: 'Booking not found' 
      });
    }

    if (booking.user.toString() !== req.userId) {
      return res.status(403).json({ 
        message: 'Unauthorized' 
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'Booking already cancelled' 
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = 'Cancelled by user';
    await booking.save();

    // Free up the seat
    await Seat.findByIdAndUpdate(
      booking.seat,
      { $set: { status: 'available' } },
      { runValidators: false }
    );

    res.json({ 
      message: 'Booking cancelled successfully' 
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ 
      message: 'Error cancelling booking' 
    });
  }
});

module.exports = router;