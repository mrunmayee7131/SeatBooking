/**
 * Time validation utilities for booking system
 * Updated: Booking window from 8 AM to 1 AM (next day)
 */

const BOOKING_WINDOW = {
  START: '08:00',
  END: '01:00'  // 1 AM next day
};

/**
 * Convert time string (HH:MM) to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if time is within booking window (8 AM to 1 AM next day)
 * Special handling: Times from 00:00-01:00 are considered valid (next day)
 * @param {string} timeStr - Time in HH:MM format
 * @returns {boolean} True if within window
 */
function isWithinBookingWindow(timeStr) {
  const timeMinutes = timeToMinutes(timeStr);
  const startMinutes = timeToMinutes(BOOKING_WINDOW.START); // 8:00 = 480 minutes
  const endMinutes = timeToMinutes(BOOKING_WINDOW.END);     // 1:00 = 60 minutes
  
  // Allow times from 08:00 to 23:59 (same day)
  // OR times from 00:00 to 01:00 (next day)
  return (timeMinutes >= startMinutes) || (timeMinutes <= endMinutes && timeMinutes < startMinutes);
}

/**
 * Validate if booking times are within allowed window
 * Window: 8 AM to 1 AM (next day)
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {Object} Validation result with isValid and message
 */
function validateBookingWindow(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // Check if start time is valid
  if (!isWithinBookingWindow(startTime)) {
    return {
      isValid: false,
      message: `Start time must be between ${BOOKING_WINDOW.START} (8 AM) and ${BOOKING_WINDOW.END} (1 AM next day)`
    };
  }
  
  // Check if end time is valid
  if (!isWithinBookingWindow(endTime)) {
    return {
      isValid: false,
      message: `End time must be between ${BOOKING_WINDOW.START} (8 AM) and ${BOOKING_WINDOW.END} (1 AM next day)`
    };
  }
  
  // Special case: If end time is after midnight (00:00-01:00) and start is before midnight
  // This is valid (e.g., 22:00 to 00:30)
  if (endMinutes <= timeToMinutes(BOOKING_WINDOW.END) && startMinutes >= timeToMinutes(BOOKING_WINDOW.START)) {
    // Start is in evening (8 AM onwards), end is after midnight (valid)
    return {
      isValid: true,
      message: 'Valid booking window'
    };
  }
  
  // Normal case: both times on same day, start must be before end
  if (startMinutes >= timeToMinutes(BOOKING_WINDOW.START) && endMinutes >= timeToMinutes(BOOKING_WINDOW.START)) {
    if (startMinutes >= endMinutes) {
      return {
        isValid: false,
        message: 'Start time must be before end time'
      };
    }
  }
  
  // Both times after midnight (00:00-01:00)
  if (startMinutes <= timeToMinutes(BOOKING_WINDOW.END) && endMinutes <= timeToMinutes(BOOKING_WINDOW.END)) {
    if (startMinutes >= endMinutes) {
      return {
        isValid: false,
        message: 'Start time must be before end time'
      };
    }
  }
  
  return {
    isValid: true,
    message: 'Valid booking window'
  };
}

/**
 * Check if two time ranges overlap
 * Handles times crossing midnight (e.g., 23:00-01:00)
 * @param {string} start1 - Start time of first range
 * @param {string} end1 - End time of first range
 * @param {string} start2 - Start time of second range
 * @param {string} end2 - End time of second range
 * @returns {boolean} True if ranges overlap
 */
function timeRangesOverlap(start1, end1, start2, end2) {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);
  
  // Handle midnight crossing for first range
  const range1CrossesMidnight = end1Min < start1Min;
  // Handle midnight crossing for second range
  const range2CrossesMidnight = end2Min < start2Min;
  
  if (range1CrossesMidnight && range2CrossesMidnight) {
    // Both cross midnight - they always overlap
    return true;
  }
  
  if (range1CrossesMidnight) {
    // Range 1 crosses midnight (e.g., 23:00-01:00)
    // Check if range 2 overlaps with either part
    return (start2Min >= start1Min) || (end2Min <= end1Min) || 
           (start2Min < end1Min) || (end2Min > start1Min);
  }
  
  if (range2CrossesMidnight) {
    // Range 2 crosses midnight
    return (start1Min >= start2Min) || (end1Min <= end2Min) || 
           (start1Min < end2Min) || (end1Min > start2Min);
  }
  
  // Standard overlap check (no midnight crossing)
  return start1Min < end2Min && end1Min > start2Min;
}

module.exports = {
  BOOKING_WINDOW,
  timeToMinutes,
  isWithinBookingWindow,
  validateBookingWindow,
  timeRangesOverlap
};