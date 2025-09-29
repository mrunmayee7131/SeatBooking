const Seat = require('../models/Seat');
const Booking = require('../models/Booking');

// Helper function to check if two time slots overlap
const timeSlotsOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};

// Helper function to get available time slots
const getAvailableTimeSlots = (bookings, queryStart, queryEnd) => {
  const slots = [];
  const now = new Date();
  
  // Filter out past and on-break bookings, only consider active bookings
  const activeBookings = bookings
    .filter(b => b.status === 'active' && new Date(b.endTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  if (activeBookings.length === 0) {
    if (queryEnd) {
      const duration = Math.floor((new Date(queryEnd) - new Date(queryStart)) / (1000 * 60));
      return [{
        start: queryStart,
        end: queryEnd,
        duration: `${duration} minutes`
      }];
    }
    return [{ start: now, end: null, duration: 'Infinity' }];
  }

  const startBoundary = queryStart ? new Date(queryStart) : now;
  const endBoundary = queryEnd ? new Date(queryEnd) : null;

  // Check for slot before first booking
  const firstBookingStart = new Date(activeBookings[0].startTime);
  if (firstBookingStart > startBoundary) {
    const slotEnd = endBoundary && endBoundary < firstBookingStart ? endBoundary : firstBookingStart;
    const duration = Math.floor((slotEnd - startBoundary) / (1000 * 60));
    if (duration >= 30) {
      slots.push({
        start: startBoundary,
        end: slotEnd,
        duration: `${duration} minutes`
      });
    }
  }

  // Check for slots between bookings
  for (let i = 0; i < activeBookings.length - 1; i++) {
    const currentEnd = new Date(activeBookings[i].endTime);
    const nextStart = new Date(activeBookings[i + 1].startTime);
    
    if (nextStart > currentEnd) {
      const slotStart = currentEnd > startBoundary ? currentEnd : startBoundary;
      const slotEnd = endBoundary && endBoundary < nextStart ? endBoundary : nextStart;
      
      if (slotEnd > slotStart) {
        const duration = Math.floor((slotEnd - slotStart) / (1000 * 60));
        if (duration >= 30) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            duration: `${duration} minutes`
          });
        }
      }
    }
  }

  // Check for slot after last booking
  const lastBookingEnd = new Date(activeBookings[activeBookings.length - 1].endTime);
  if (!endBoundary || lastBookingEnd < endBoundary) {
    const slotStart = lastBookingEnd > startBoundary ? lastBookingEnd : startBoundary;
    if (endBoundary) {
      const duration = Math.floor((endBoundary - slotStart) / (1000 * 60));
      if (duration >= 30) {
        slots.push({
          start: slotStart,
          end: endBoundary,
          duration: `${duration} minutes`
        });
      }
    } else {
      slots.push({
        start: slotStart,
        end: endBoundary,
        duration: 'Infinity'
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

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      const seatsWithAvailability = seats.map(seat => {
        // STEP 1: Find all on-break bookings that overlap with query time
        const breakBookings = seat.bookings.filter(booking => {
          if (booking.status !== 'on-break') return false;
          return timeSlotsOverlap(
            new Date(booking.startTime),
            new Date(booking.endTime),
            start,
            end
          );
        });

        // STEP 2: Find active bookings, but EXCLUDE parts covered by breaks
        const activeBookings = seat.bookings.filter(booking => {
          if (booking.status !== 'active') return false;
          
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          // Check if this active booking overlaps with query
          if (!timeSlotsOverlap(bookingStart, bookingEnd, start, end)) {
            return false;
          }
          
          // Check if the OVERLAP portion is covered by a break
          const overlapStart = new Date(Math.max(bookingStart.getTime(), start.getTime()));
          const overlapEnd = new Date(Math.min(bookingEnd.getTime(), end.getTime()));
          
          // See if this overlap is completely covered by break time
          const isCoveredByBreak = breakBookings.some(brk => {
            const brkStart = new Date(brk.startTime);
            const brkEnd = new Date(brk.endTime);
            return brkStart <= overlapStart && brkEnd >= overlapEnd;
          });
          
          // If overlap is covered by break, don't count this as a conflict
          return !isCoveredByBreak;
        });

        const availableSlots = getAvailableTimeSlots(seat.bookings, start, end);

        // STEP 3: Determine seat status
        let status = 'available';
        let isAvailable = true;

        if (activeBookings.length > 0) {
          // Has uncovered active bookings - fully booked
          status = 'booked';
          isAvailable = false;
        } else if (breakBookings.length > 0) {
          // Only has break bookings - limited availability
          status = 'limited';
          isAvailable = true;
        }

        console.log(`Seat ${seat.seatNumber}: active=${activeBookings.length}, breaks=${breakBookings.length}, status=${status}`);

        return {
          ...seat.toObject(),
          isAvailable,
          status,
          availableSlots,
          breakSlots: breakBookings.map(b => ({
            start: b.startTime,
            end: b.endTime
          }))
        };
      });

      return res.json(seatsWithAvailability);
    }

    const seatsWithSlots = seats.map(seat => ({
      ...seat.toObject(),
      availableSlots: getAvailableTimeSlots(seat.bookings, null, null),
      status: 'available',
      isAvailable: true
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

    if (!seatId || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide seat, start time, and end time' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    if (start < new Date()) {
      return res.status(400).json({ message: 'Cannot book for past time' });
    }

    const durationMinutes = (end - start) / (1000 * 60);
    if (durationMinutes < 30) {
      return res.status(400).json({ message: 'Minimum booking duration is 30 minutes' });
    }

    const seat = await Seat.findById(seatId);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // CRITICAL: Find all on-break periods that overlap with requested time
    const overlappingBreaks = seat.bookings.filter(booking => 
      booking.status === 'on-break' &&
      timeSlotsOverlap(
        new Date(booking.startTime),
        new Date(booking.endTime),
        start,
        end
      )
    );

    console.log(`Booking attempt: ${start} to ${end}`);
    console.log(`Found ${overlappingBreaks.length} overlapping breaks`);

    // If booking overlaps with breaks, it MUST be completely within ONE break period
    if (overlappingBreaks.length > 0) {
      const breakStart = new Date(overlappingBreaks[0].startTime);
      const breakEnd = new Date(overlappingBreaks[0].endTime);
      const breakOwnerId = overlappingBreaks[0].user.toString();
      
      console.log(`Break period: ${breakStart} to ${breakEnd}, Owner: ${breakOwnerId}`);
      console.log(`Checking: ${start} >= ${breakStart} && ${end} <= ${breakEnd}`);
      
      // The booking must be completely within the break time
      if (start < breakStart || end > breakEnd) {
        return res.status(400).json({ 
          message: `Limited availability. You can only book from ${breakStart.toLocaleString()} to ${breakEnd.toLocaleString()}`
        });
      }
      
      console.log('✅ Booking is within break time - ALLOWED');
      
      // CRITICAL FIX: Check if someone else (NOT the break owner) already booked this slot
      const breakSlotConflict = seat.bookings.some(booking => {
        if (booking.status !== 'active') return false;
        if (booking.user.toString() === userId) return false; // Ignore current user's bookings
        if (booking.user.toString() === breakOwnerId) return false; // IGNORE break owner's main booking
        
        return timeSlotsOverlap(
          new Date(booking.startTime),
          new Date(booking.endTime),
          start,
          end
        );
      });
      
      if (breakSlotConflict) {
        return res.status(400).json({ 
          message: 'This break time slot has already been booked by another user'
        });
      }
      
    } else {
      // No break overlap - check for regular active booking conflicts
      const hasActiveConflict = seat.bookings.some(booking => {
        if (booking.status !== 'active') return false;
        return timeSlotsOverlap(
          new Date(booking.startTime),
          new Date(booking.endTime),
          start,
          end
        );
      });

      if (hasActiveConflict) {
        return res.status(400).json({ message: 'This seat is already booked for the selected time slot' });
      }
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

    console.log('✅ Booking created successfully');

    res.json({ 
      message: 'Seat booked successfully', 
      booking 
    });
  } catch (error) {
    console.error('Booking error:', error);
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

    if (end < now) {
      return res.status(400).json({ message: 'Cannot set break for past time' });
    }

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
      
      console.log(`✅ Break added: ${start} to ${end} for seat ${seat.seatNumber}`);
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

    if (booking.user.toString() !== userId) {
      return res.status(403).json({ message: 'You can only cancel your own booking' });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Remove ALL bookings from seat (both active and on-break) for this user
    const seat = await Seat.findOne({
      seatNumber: booking.seatNumber,
      location: booking.location
    });

    if (seat) {
      // Remove the main booking
      seat.bookings = seat.bookings.filter(b => 
        !(b.user.toString() === userId && 
          b.startTime.getTime() === booking.startTime.getTime() &&
          b.endTime.getTime() === booking.endTime.getTime() &&
          b.status === 'active')
      );
      
      // Also remove all on-break bookings for this user during this time
      seat.bookings = seat.bookings.filter(b => {
        if (b.status !== 'on-break' || b.user.toString() !== userId) return true;
        // Remove break bookings that fall within the cancelled booking period
        const breakStart = new Date(b.startTime);
        const breakEnd = new Date(b.endTime);
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        return !(breakStart >= bookingStart && breakEnd <= bookingEnd);
      });
      
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
    const now = new Date();
    
    // Get all bookings for the user
    const bookings = await Booking.find({ user: userId })
      .sort({ bookedAt: -1 });
    
    // Mark expired bookings as completed
    const bookingsWithStatus = bookings.map(booking => {
      const bookingObj = booking.toObject();
      
      // If booking is active but endTime has passed, mark as expired
      if (bookingObj.status === 'active' && new Date(bookingObj.endTime) < now) {
        bookingObj.status = 'expired';
        // Also update in database
        Booking.findByIdAndUpdate(booking._id, { status: 'completed' }).exec();
      }
      
      return bookingObj;
    });
    
    res.json({ bookings: bookingsWithStatus });
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
      currentBookings: seat.bookings.filter(b => new Date(b.endTime) > new Date())
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};