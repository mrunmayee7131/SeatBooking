const express = require('express');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { checkAttendance, scheduleAttendanceCheck, checkAndCancelExpiredBookings } = require('../services/attendanceChecker');
const { generateDeviceFingerprint, hasValidFingerprint } = require('../utils/deviceFingerprint');
const { validateBookingWindow, timeRangesOverlap } = require('../utils/timeValidation');

const router = express.Router();

// Helper function to convert time to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Create a new booking
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const { seatId, date, startTime, endTime } = req.body;

    if (!seatId || !date || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    // Validate booking window (8 AM - 6 PM)
    const windowValidation = validateBookingWindow(startTime, endTime);
    if (!windowValidation.isValid) {
      return res.status(400).json({ 
        message: windowValidation.message 
      });
    }

    // Generate device fingerprint
    if (!hasValidFingerprint(req)) {
      return res.status(400).json({ 
        message: 'Unable to identify device. Please ensure cookies and headers are enabled.' 
      });
    }
    const deviceFingerprint = generateDeviceFingerprint(req);

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

    const bookingDate = new Date(date);
    const dayStart = new Date(bookingDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Check for overlapping bookings on the same seat
    const existingBooking = await Booking.findOne({
      seat: seatId,
      date: {
        $gte: dayStart,
        $lt: dayEnd
      },
      status: { $in: ['pending', 'confirmed', 'on-break'] },
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

    // Check for overlapping bookings from the same device
    const deviceBookings = await Booking.find({
      deviceFingerprint: deviceFingerprint,
      date: {
        $gte: dayStart,
        $lt: dayEnd
      },
      status: { $in: ['pending', 'confirmed', 'on-break'] }
    }).populate('seat');

    // Check if any existing booking from this device overlaps with the requested time
    for (const existingDeviceBooking of deviceBookings) {
      if (timeRangesOverlap(
        existingDeviceBooking.startTime,
        existingDeviceBooking.endTime,
        startTime,
        endTime
      )) {
        const seatNumber = existingDeviceBooking.seat ? existingDeviceBooking.seat.seatNumber : 'Unknown';
        
        return res.status(400).json({ 
          message: `You already have a booking from ${existingDeviceBooking.startTime} to ${existingDeviceBooking.endTime} on this date. Multiple overlapping bookings from the same device are not allowed.`,
          existingBooking: {
            startTime: existingDeviceBooking.startTime,
            endTime: existingDeviceBooking.endTime,
            seatNumber: seatNumber
          }
        });
      }
    }

    // Create booking
    const booking = new Booking({
      user: req.userId,
      seat: seatId,
      date: bookingDate,
      startTime,
      endTime,
      status: 'pending',
      deviceFingerprint: deviceFingerprint,
      breaks: [],
      currentBreak: null
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

// Start a break
router.post('/start-break/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { breakStartTime, breakEndTime } = req.body;

    console.log('Break request received:', { bookingId, breakStartTime, breakEndTime });

    if (!breakStartTime || !breakEndTime) {
      return res.status(400).json({ 
        message: 'Break start and end times are required' 
      });
    }

    const booking = await Booking.findById(bookingId).populate('seat');

    if (!booking) {
      return res.status(404).json({ 
        message: 'Booking not found' 
      });
    }

    console.log('Booking found:', {
      id: booking._id,
      status: booking.status,
      currentBreak: booking.currentBreak,
      attendanceConfirmed: booking.attendanceConfirmed
    });

    if (booking.user.toString() !== req.userId) {
      return res.status(403).json({ 
        message: 'Unauthorized' 
      });
    }

    // Check if already on break - be more specific
    if (booking.currentBreak && booking.currentBreak.startTime) {
      return res.status(400).json({ 
        message: 'You are already on a break' 
      });
    }

    // Accept both 'confirmed' and 'pending' with attendance confirmed
    if (booking.status !== 'confirmed' && !(booking.status === 'pending' && booking.attendanceConfirmed)) {
      return res.status(400).json({ 
        message: `Cannot take break. Status: ${booking.status}, Attendance confirmed: ${booking.attendanceConfirmed}. Please confirm attendance first.` 
      });
    }

    // Validate break duration (minimum 20 minutes)
    const breakStartMinutes = timeToMinutes(breakStartTime);
    const breakEndMinutes = timeToMinutes(breakEndTime);
    let breakDuration = breakEndMinutes - breakStartMinutes;
    
    // Handle overnight breaks (e.g., 23:00 to 00:30)
    if (breakDuration < 0) {
      breakDuration = (24 * 60 - breakStartMinutes) + breakEndMinutes;
    }

    console.log('Break duration:', breakDuration, 'minutes');

    if (breakDuration < 20) {
      return res.status(400).json({ 
        message: `Break must be at least 20 minutes long. Current duration: ${breakDuration} minutes` 
      });
    }

    // Validate break is within booking time
    const bookingStartMinutes = timeToMinutes(booking.startTime);
    let bookingEndMinutes = timeToMinutes(booking.endTime);
    
    // Handle overnight bookings
    if (bookingEndMinutes < bookingStartMinutes) {
      bookingEndMinutes += 24 * 60;
    }

    let adjustedBreakStart = breakStartMinutes;
    let adjustedBreakEnd = breakEndMinutes;

    // Adjust for overnight scenarios
    if (breakStartMinutes < bookingStartMinutes && bookingEndMinutes > 24 * 60) {
      adjustedBreakStart += 24 * 60;
    }
    if (breakEndMinutes < breakStartMinutes) {
      adjustedBreakEnd += 24 * 60;
    }

    console.log('Time validation:', {
      bookingStart: bookingStartMinutes,
      bookingEnd: bookingEndMinutes,
      breakStart: adjustedBreakStart,
      breakEnd: adjustedBreakEnd
    });

    if (adjustedBreakStart < bookingStartMinutes || adjustedBreakEnd > bookingEndMinutes) {
      return res.status(400).json({ 
        message: `Break must be within your booking time slot (${booking.startTime} - ${booking.endTime})` 
      });
    }

    // Check for overlapping breaks
    if (booking.breaks && booking.breaks.length > 0) {
      for (const existingBreak of booking.breaks) {
        if (timeRangesOverlap(
          existingBreak.startTime,
          existingBreak.endTime,
          breakStartTime,
          breakEndTime
        )) {
          return res.status(400).json({ 
            message: `Break time overlaps with an existing break (${existingBreak.startTime} - ${existingBreak.endTime})` 
          });
        }
      }
    }

    // Start the break
    booking.currentBreak = {
      startTime: breakStartTime,
      endTime: breakEndTime,
      startedAt: new Date()
    };
    booking.status = 'on-break';
    
    // Mark as modified to ensure save
    booking.markModified('currentBreak');
    booking.markModified('status');
    
    await booking.save();

    console.log('Break started successfully for booking:', bookingId);

    const updatedBooking = await Booking.findById(bookingId).populate('seat');

    res.json({
      message: 'Break started successfully',
      booking: updatedBooking,
      currentBreak: updatedBooking.currentBreak
    });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ 
      message: 'Error starting break',
      error: error.message 
    });
  }
});

// End a break
router.post('/end-break/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId).populate('seat');

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

    if (!booking.currentBreak || !booking.currentBreak.startTime) {
      return res.status(400).json({ 
        message: 'No active break found' 
      });
    }

    // Save the break to history
    if (!booking.breaks) {
      booking.breaks = [];
    }
    
    booking.breaks.push({
      startTime: booking.currentBreak.startTime,
      endTime: booking.currentBreak.endTime,
      takenAt: booking.currentBreak.startedAt
    });

    // Clear current break and restore status
    booking.currentBreak = null;
    booking.status = 'confirmed';
    
    booking.markModified('breaks');
    booking.markModified('currentBreak');
    booking.markModified('status');
    
    await booking.save();

    const updatedBooking = await Booking.findById(bookingId).populate('seat');

    res.json({
      message: 'Break ended successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ 
      message: 'Error ending break',
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
    // First, check and cancel any expired bookings
    await checkAndCancelExpiredBookings(req.userId);
    
    // Then fetch all bookings
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
    booking.currentBreak = null; // Clear any active break
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