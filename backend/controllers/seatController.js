const Seat = require('../models/Seat');
const Booking = require('../models/Booking');

// Helper function to check if time slots overlap
const timeSlotsOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

// Helper function to get available time slots
const getAvailableTimeSlots = (bookings, queryStart, queryEnd) => {
  const now = new Date();
  const slots = [];

  // Filter active bookings and breaks
  const activeBookings = bookings.filter(b => 
    b.status === 'active' && new Date(b.endTime) > now
  );

  if (activeBookings.length === 0) {
    return [{ start: null, end: null, duration: 'Infinity' }];
  }

  // Sort bookings by start time
  activeBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  let currentTime = queryStart ? new Date(queryStart) : now;
  const endBoundary = queryEnd ? new Date(queryEnd) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  for (const booking of activeBookings) {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);

    // Check if there's a gap before this booking
    if (currentTime < bookingStart) {
      const duration = Math.floor((bookingStart - currentTime) / (1000 * 60)); // in minutes
      if (duration >= 30) {
        slots.push({
          start: currentTime,
          end: bookingStart,
          duration: `${duration} minutes`
        });
      }
    }

    // Update current time to the end of this booking
    if (bookingEnd > currentTime) {
      currentTime = bookingEnd;
    }
  }

  // Check if there's time after the last booking
  if (currentTime < endBoundary) {
    const duration = Math.floor((endBoundary - currentTime) / (1000 * 60));
    if (duration >= 30 || !queryEnd) {
      slots.push({
        start: currentTime,
        end: queryEnd ? endBoundary : null,
        duration: queryEnd ? `${duration} minutes` : 'Infinity'
      });
    }
  }

  return slots.length > 0 ? slots : [];
};

// @desc    Get all seats for a specific location with availability
// @route   GET /api/seats/:location
// @access  Private
exports.getSeats = async (req, res) => {
  try {
    const { location } = req.params;
    const { startTime, endTime } = req.query;

    const seats = await Seat.find({ location });

    // If time range is provided, check availability
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      const seatsWithAvailability = seats.map(seat => {
        // Check if any active booking (not on break) overlaps with requested time
        const hasConflict = seat.bookings.some(booking => {
          if (booking.status === 'on-break') return false;
          return timeSlotsOverlap(
            new Date(booking.startTime),
            new Date(booking.endTime),
            start,
            end
          );
        });

        const availableSlots = getAvailableTimeSlots(seat.bookings, start, end);

        return {
          ...seat.toObject(),
          isAvailable: !hasConflict,
          availableSlots
        };
      });

      return res.json(seatsWithAvailability);
    }

    // Without time filter, just return seats with availability info
    const seatsWithSlots = seats.map(seat => ({
      ...seat.toObject(),
      availableSlots: getAvailableTimeSlots(seat.bookings, null, null)
    }));

    res.json(seatsWithSlots);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Book a seat with time slot
// @route   POST /api/seats/book
// @access  Private
exports.bookSeat = async (req, res) => {
  try {
    const { seatId, startTime, endTime } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!seatId || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide seat, start time, and end time' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validate time range
    if (start >= end) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    if (start < new Date()) {
      return res.status(400).json({ message: 'Cannot book for past time' });
    }

    // Check minimum 30 minutes booking
    const durationMinutes = (end - start) / (1000 * 60);
    if (durationMinutes < 30) {
      return res.status(400).json({ message: 'Minimum booking duration is 30 minutes' });
    }

    // Find the seat
    const seat = await Seat.findById(seatId);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // Check if the time slot is available (ignoring on-break bookings)
    const hasConflict = seat.bookings.some(booking => {
      if (booking.status === 'on-break') return false;
      return timeSlotsOverlap(
        new Date(booking.startTime),
        new Date(booking.endTime),
        start,
        end
      );
    });

    if (hasConflict) {
      return res.status(400).json({ message: 'This seat is already booked for the selected time slot' });
    }

    // Add booking to seat
    seat.bookings.push({
      user: userId,
      userName: req.user.name,
      userEmail: req.user.email,
      startTime: start,
      endTime: end,
      status: 'active'
    });

    await seat.save();

    // Create booking record
    const booking = await Booking.create({
      user: userId,
      userName: req.user.name,
      userEmail: req.user.email,
      seatNumber: seat.seatNumber,
      location: seat.location,
      startTime: start,
      endTime: end,
      status: 'active',
      breaks: []
    });

    res.json({ 
      message: 'Seat booked successfully', 
      booking 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Put booking on break
// @route   POST /api/seats/break
// @access  Private
exports.putOnBreak = async (req, res) => {
  try {
    const { bookingId, breakStart, breakEnd } = req.body;
    const userId = req.user.id;

    if (!bookingId || !breakStart || !breakEnd) {
      return res.status(400).json({ message: 'Please provide booking ID, break start and end time' });
    }

    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if the booking belongs to the current user
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ message: 'You can only manage your own bookings' });
    }

    const start = new Date(breakStart);
    const end = new Date(breakEnd);
    const now = new Date();

    // Validate break is within booking time
    if (start < new Date(booking.startTime) || end > new Date(booking.endTime)) {
      return res.status(400).json({ message: 'Break time must be within your booking period' });
    }

    // Validate break is in the future or current
    if (end < now) {
      return res.status(400).json({ message: 'Cannot set break for past time' });
    }

    // Check minimum 30 minutes break
    const breakDuration = (end - start) / (1000 * 60);
    if (breakDuration < 30) {
      return res.status(400).json({ message: 'Break duration must be at least 30 minutes' });
    }

    // Check for overlapping breaks
    const hasOverlap = booking.breaks.some(existingBreak => 
      timeSlotsOverlap(
        new Date(existingBreak.breakStart),
        new Date(existingBreak.breakEnd),
        start,
        end
      )
    );

    if (hasOverlap) {
      return res.status(400).json({ message: 'Break times cannot overlap with existing breaks' });
    }

    // Add break to booking
    booking.breaks.push({
      breakStart: start,
      breakEnd: end
    });

    await booking.save();

    // Update seat bookings to mark as on-break
    const seat = await Seat.findOne({
      seatNumber: booking.seatNumber,
      location: booking.location
    });

    if (seat) {
      // Add a temporary on-break booking
      seat.bookings.push({
        user: userId,
        userName: req.user.name,
        userEmail: req.user.email,
        startTime: start,
        endTime: end,
        status: 'on-break'
      });
      await seat.save();
    }

    res.json({ 
      message: 'Break added successfully. Others can now book this seat during your break time.',
      booking 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Cancel seat booking
// @route   POST /api/seats/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if the booking belongs to the current user
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ message: 'You can only cancel your own booking' });
    }

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();

    // Remove booking from seat
    const seat = await Seat.findOne({
      seatNumber: booking.seatNumber,
      location: booking.location
    });

    if (seat) {
      seat.bookings = seat.bookings.filter(b => 
        !(b.user.toString() === userId && 
          b.startTime.getTime() === booking.startTime.getTime() &&
          b.endTime.getTime() === booking.endTime.getTime() &&
          b.status !== 'on-break')
      );
      await seat.save();
    }

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's active bookings
// @route   GET /api/seats/my-bookings/active
// @access  Private
exports.getMyActiveBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    const bookings = await Booking.find({ 
      user: userId,
      status: 'active',
      endTime: { $gte: now }
    }).sort({ startTime: 1 });
    
    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all user's bookings (history)
// @route   GET /api/seats/my-bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const bookings = await Booking.find({ user: userId })
      .sort({ bookedAt: -1 });
    
    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get seat details with availability info
// @route   GET /api/seats/details/:seatId
// @access  Private
exports.getSeatDetails = async (req, res) => {
  try {
    const { seatId } = req.params;
    const { startTime, endTime } = req.query;

    const seat = await Seat.findById(seatId);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : null;

    const availableSlots = getAvailableTimeSlots(seat.bookings, start, end);

    res.json({
      seat,
      availableSlots,
      currentBookings: seat.bookings.filter(b => b.status === 'active')
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};