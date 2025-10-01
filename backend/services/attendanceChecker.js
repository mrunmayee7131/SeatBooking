const Booking = require('../models/Booking');
const User = require('../models/User');
const Seat = require('../models/Seat');
const { isWithinAttendanceRadius } = require('../utils/locationUtils');

/**
 * Check if user has reached their booked seat
 * @param {string} bookingId - Booking ID
 * @returns {Object} Result of attendance check
 */
async function checkAttendance(bookingId) {
  try {
    const booking = await Booking.findById(bookingId).populate('user seat');
    
    if (!booking) {
      return { success: false, message: 'Booking not found' };
    }

    if (booking.status === 'cancelled') {
      return { success: false, message: 'Booking already cancelled' };
    }

    if (booking.attendanceConfirmed) {
      return { success: true, message: 'Attendance already confirmed' };
    }

    const user = booking.user;

    if (!user.lastKnownLocation || !user.lastKnownLocation.latitude) {
      return { 
        success: false, 
        message: 'User location not available' 
      };
    }

    // Check if user is within 100 meters of library
    const withinRadius = isWithinAttendanceRadius(
      user.lastKnownLocation.latitude,
      user.lastKnownLocation.longitude
    );

    if (withinRadius) {
      booking.attendanceConfirmed = true;
      booking.attendanceConfirmedAt = new Date();
      booking.status = 'confirmed';
      await booking.save();

      return { 
        success: true, 
        message: 'Attendance confirmed successfully',
        booking 
      };
    } else {
      return { 
        success: false, 
        message: 'User not within required distance of library' 
      };
    }
  } catch (error) {
    console.error('Error checking attendance:', error);
    return { 
      success: false, 
      message: 'Error checking attendance' 
    };
  }
}

/**
 * Auto-cancel booking if user hasn't reached within time limit
 * @param {string} bookingId - Booking ID
 */
async function autoCancelIfNotPresent(bookingId) {
  try {
    const booking = await Booking.findById(bookingId).populate('user seat');
    
    if (!booking || booking.status === 'cancelled') {
      return;
    }

    if (booking.attendanceConfirmed) {
      console.log(`Booking ${bookingId} already confirmed, skipping auto-cancel`);
      return;
    }

    // Cancel the booking
    booking.status = 'cancelled';
    booking.cancellationReason = 'User did not reach seat within 20 minutes of booking start time';
    await booking.save();

    // Free up the seat
    const seat = await Seat.findById(booking.seat);
    if (seat) {
      seat.status = 'available';
      await seat.save();
    }

    console.log(`Booking ${bookingId} auto-cancelled due to non-attendance`);
  } catch (error) {
    console.error('Error in auto-cancel:', error);
  }
}

/**
 * Schedule attendance check for a booking
 * @param {Object} booking - Booking object
 */
function scheduleAttendanceCheck(booking) {
  const now = new Date();
  const bookingDate = new Date(booking.date);
  const [hours, minutes] = booking.startTime.split(':');
  
  bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Check time: 20 minutes after booking start time
  const checkTime = new Date(bookingDate.getTime() + 20 * 60 * 1000);
  const delay = checkTime - now;

  if (delay > 0) {
    setTimeout(() => {
      autoCancelIfNotPresent(booking._id.toString());
    }, delay);

    console.log(`Scheduled attendance check for booking ${booking._id} at ${checkTime}`);
    return true;
  } else {
    console.log(`Booking ${booking._id} check time already passed`);
    return false;
  }
}

module.exports = {
  checkAttendance,
  autoCancelIfNotPresent,
  scheduleAttendanceCheck
};