const express = require('express');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function to convert time to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Check if requested time is completely within a break time
function isTimeWithinBreak(requestStart, requestEnd, breakStart, breakEnd) {
  const reqStartMin = timeToMinutes(requestStart);
  const reqEndMin = timeToMinutes(requestEnd);
  const breakStartMin = timeToMinutes(breakStart);
  const breakEndMin = timeToMinutes(breakEnd);

  // Requested time must be completely within break time
  return reqStartMin >= breakStartMin && reqEndMin <= breakEndMin;
}

// Get all seats with their booking status
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { floor, section, status, date, startTime, endTime } = req.query;
    
    const filter = {};
    if (floor) filter.floor = parseInt(floor);
    if (section) filter.section = section;
    if (status) filter.status = status;

    const seats = await Seat.find(filter).sort({ floor: 1, seatNumber: 1 });
    
    // If date and time are provided, check for bookings (including on-break status)
    if (date && startTime && endTime) {
      const bookingDate = new Date(date);
      const dayStart = new Date(bookingDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(bookingDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Find all bookings for this date
      const bookings = await Booking.find({
        date: {
          $gte: dayStart,
          $lt: dayEnd
        },
        status: { $in: ['pending', 'confirmed', 'on-break'] }
      }).populate('seat user');

      // Add booking info and on-break status to seats
      const seatsWithBookingInfo = seats.map(seat => {
        // Find bookings for this seat
        const seatBookings = bookings.filter(b => 
          b.seat && b.seat._id.toString() === seat._id.toString()
        );

        let isBooked = false;
        let isOnBreak = false;
        let bookingStatus = null;
        let currentBreak = null;
        let availableInBreak = false;
        let breakTimeInfo = null;

        for (const booking of seatBookings) {
          // Check if there's an overlap with requested time (excluding break times)
          const bookStartMin = timeToMinutes(booking.startTime);
          const bookEndMin = timeToMinutes(booking.endTime);
          const reqStartMin = timeToMinutes(startTime);
          const reqEndMin = timeToMinutes(endTime);

          // Check if booking is on break
          if (booking.status === 'on-break' && booking.currentBreak) {
            isOnBreak = true;
            currentBreak = booking.currentBreak;

            // Check if requested time is COMPLETELY within the break time
            if (isTimeWithinBreak(startTime, endTime, booking.currentBreak.startTime, booking.currentBreak.endTime)) {
              availableInBreak = true;
              breakTimeInfo = {
                breakStart: booking.currentBreak.startTime,
                breakEnd: booking.currentBreak.endTime,
                ownerName: booking.user?.name || 'User'
              };
            } else {
              // If not completely within break, check if there's overlap with non-break time
              // FIXED: Only mark as booked if there's actual time overlap with non-break portions
              if (reqStartMin < bookEndMin && reqEndMin > bookStartMin) {
                isBooked = true;
              }
            }
          } else {
            // Regular booking - check for overlap
            // FIXED: This is the key change - only check for time overlap, not entire day
            if (reqStartMin < bookEndMin && reqEndMin > bookStartMin) {
              isBooked = true;
              bookingStatus = booking.status;
            }
          }
        }

        return {
          ...seat.toObject(),
          isBooked: isBooked && !availableInBreak,
          isOnBreak,
          availableInBreak,
          breakTimeInfo,
          bookingStatus,
          currentBreak
        };
      });

      return res.json({ seats: seatsWithBookingInfo });
    }

    res.json({ seats });
  } catch (error) {
    console.error('Error fetching seats:', error);
    res.status(500).json({ 
      message: 'Error fetching seats' 
    });
  }
});

// Get available seats for a specific date and time
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'Date, start time, and end time are required' 
      });
    }

    // Get all available seats
    const allSeats = await Seat.find({ status: 'available' });

    const bookingDate = new Date(date);
    const dayStart = new Date(bookingDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Find all bookings for this date
    const bookings = await Booking.find({
      date: {
        $gte: dayStart,
        $lt: dayEnd
      },
      status: { $in: ['pending', 'confirmed', 'on-break'] }
    });

    const availableSeats = [];

    for (const seat of allSeats) {
      let seatAvailable = true;

      const seatBookings = bookings.filter(b => b.seat.toString() === seat._id.toString());

      for (const booking of seatBookings) {
        const bookStartMin = timeToMinutes(booking.startTime);
        const bookEndMin = timeToMinutes(booking.endTime);
        const reqStartMin = timeToMinutes(startTime);
        const reqEndMin = timeToMinutes(endTime);

        // If booking is on break, check if requested time is within break
        if (booking.status === 'on-break' && booking.currentBreak) {
          const isWithinBreak = isTimeWithinBreak(
            startTime,
            endTime,
            booking.currentBreak.startTime,
            booking.currentBreak.endTime
          );

          if (!isWithinBreak) {
            // Requested time is not within break, check normal overlap
            // FIXED: Only check for actual time overlap
            if (reqStartMin < bookEndMin && reqEndMin > bookStartMin) {
              seatAvailable = false;
              break;
            }
          }
          // If within break, seat is available - continue to next booking
        } else {
          // Regular booking - check for overlap
          // FIXED: This is the critical fix - check ONLY for time overlap
          if (reqStartMin < bookEndMin && reqEndMin > bookStartMin) {
            seatAvailable = false;
            break;
          }
        }
      }

      if (seatAvailable) {
        availableSeats.push(seat);
      }
    }

    res.json({ seats: availableSeats });
  } catch (error) {
    console.error('Error fetching available seats:', error);
    res.status(500).json({ 
      message: 'Error fetching available seats' 
    });
  }
});

// Get seat by ID
router.get('/:seatId', authenticateToken, async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.seatId);

    if (!seat) {
      return res.status(404).json({ 
        message: 'Seat not found' 
      });
    }

    res.json({ seat });
  } catch (error) {
    console.error('Error fetching seat:', error);
    res.status(500).json({ 
      message: 'Error fetching seat' 
    });
  }
});

module.exports = router;