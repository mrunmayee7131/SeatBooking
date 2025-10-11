const Booking = require('../models/Booking');
const Seat = require('../models/Seat');

/**
 * Check if a booking slot has expired (booking date/time has passed)
 * @param {Object} booking - Booking object
 * @returns {boolean} True if booking has expired
 */
function isBookingExpired(booking) {
  const now = new Date();
  const bookingDate = new Date(booking.date);
  const [hours, minutes] = booking.endTime.split(':');
  bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Booking is expired if current time is past the end time
  return now > bookingDate;
}

/**
 * Check if break period has ended
 * @param {Object} booking - Booking object with currentBreak
 * @returns {boolean} True if break period has ended
 */
function isBreakExpired(booking) {
  if (!booking.currentBreak || !booking.currentBreak.endTime) {
    return false;
  }

  const now = new Date();
  const bookingDate = new Date(booking.date);
  const [hours, minutes] = booking.currentBreak.endTime.split(':');
  bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Break is expired if current time is past the break end time
  return now > bookingDate;
}

/**
 * Auto-expire bookings that have passed their end time
 * Marks them as completed and frees up the seat
 */
async function checkAndExpireBookings() {
  try {
    const now = new Date();
    
    // Find all active bookings (pending, confirmed, or on-break)
    const activeBookings = await Booking.find({
      status: { $in: ['pending', 'confirmed', 'on-break'] }
    }).populate('seat');

    let expiredCount = 0;
    let breakEndedCount = 0;

    for (const booking of activeBookings) {
      // Check if booking slot has expired
      if (isBookingExpired(booking)) {
        booking.status = 'completed';
        booking.completedAt = now;
        await booking.save();

        // Free up the seat if it was in use
        if (booking.seat && booking.seat.status !== 'available') {
          await Seat.findByIdAndUpdate(
            booking.seat._id,
            { $set: { status: 'available' } },
            { runValidators: false }
          );
        }

        expiredCount++;
        console.log(`Booking ${booking._id} expired and marked as completed`);
      }
      // If booking hasn't expired but break period has ended
      else if (booking.status === 'on-break' && isBreakExpired(booking)) {
        // Save break to history
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

        breakEndedCount++;
        console.log(`Break period ended for booking ${booking._id}, restored to confirmed status`);
      }
    }

    if (expiredCount > 0 || breakEndedCount > 0) {
      console.log(`Expired ${expiredCount} bookings and ended ${breakEndedCount} breaks`);
    }

    return { expiredCount, breakEndedCount };
  } catch (error) {
    console.error('Error checking expired bookings:', error);
    return { expiredCount: 0, breakEndedCount: 0 };
  }
}

/**
 * Check and expire a specific user's bookings
 * @param {string} userId - User ID
 */
async function checkUserBookingsExpiration(userId) {
  try {
    const now = new Date();
    
    const userBookings = await Booking.find({
      user: userId,
      status: { $in: ['pending', 'confirmed', 'on-break'] }
    }).populate('seat');

    let expiredCount = 0;
    let breakEndedCount = 0;

    for (const booking of userBookings) {
      if (isBookingExpired(booking)) {
        booking.status = 'completed';
        booking.completedAt = now;
        await booking.save();

        if (booking.seat && booking.seat.status !== 'available') {
          await Seat.findByIdAndUpdate(
            booking.seat._id,
            { $set: { status: 'available' } },
            { runValidators: false }
          );
        }

        expiredCount++;
      } else if (booking.status === 'on-break' && isBreakExpired(booking)) {
        if (!booking.breaks) {
          booking.breaks = [];
        }
        
        booking.breaks.push({
          startTime: booking.currentBreak.startTime,
          endTime: booking.currentBreak.endTime,
          takenAt: booking.currentBreak.startedAt
        });

        booking.currentBreak = null;
        booking.status = 'confirmed';
        
        booking.markModified('breaks');
        booking.markModified('currentBreak');
        booking.markModified('status');
        
        await booking.save();

        breakEndedCount++;
      }
    }

    return { expiredCount, breakEndedCount };
  } catch (error) {
    console.error('Error checking user bookings expiration:', error);
    return { expiredCount: 0, breakEndedCount: 0 };
  }
}

/**
 * Start periodic checking for expired bookings
 * Runs every 5 minutes
 */
function startExpirationChecker() {
  // Run immediately on startup
  checkAndExpireBookings();
  
  // Then run every 5 minutes
  const interval = setInterval(() => {
    checkAndExpireBookings();
  }, 5 * 60 * 1000); // 5 minutes

  console.log('Booking expiration checker started (runs every 5 minutes)');
  
  return interval;
}

module.exports = {
  isBookingExpired,
  isBreakExpired,
  checkAndExpireBookings,
  checkUserBookingsExpiration,
  startExpirationChecker
};