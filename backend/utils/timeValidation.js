/**
 * Time validation utilities for booking system
 */

const BOOKING_WINDOW = {
  START: '08:00',
  END: '18:00'
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
 * Check if time is within booking window (8 AM - 6 PM)
 * @param {string} timeStr - Time in HH:MM format
 * @returns {boolean} True if within window
 */
function isWithinBookingWindow(timeStr) {
  const timeMinutes = timeToMinutes(timeStr);
  const startMinutes = timeToMinutes(BOOKING_WINDOW.START);
  const endMinutes = timeToMinutes(BOOKING_WINDOW.END);
  
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Validate if booking times are within allowed window
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {Object} Validation result with isValid and message
 */
function validateBookingWindow(startTime, endTime) {
  if (!isWithinBookingWindow(startTime)) {
    return {
      isValid: false,
      message: `Start time must be between ${BOOKING_WINDOW.START} and ${BOOKING_WINDOW.END}`
    };
  }
  
  if (!isWithinBookingWindow(endTime)) {
    return {
      isValid: false,
      message: `End time must be between ${BOOKING_WINDOW.START} and ${BOOKING_WINDOW.END}`
    };
  }
  
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return {
      isValid: false,
      message: 'Start time must be before end time'
    };
  }
  
  return {
    isValid: true,
    message: 'Valid booking window'
  };
}

/**
 * Check if two time ranges overlap
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
  
  return start1Min < end2Min && end1Min > start2Min;
}

module.exports = {
  BOOKING_WINDOW,
  timeToMinutes,
  isWithinBookingWindow,
  validateBookingWindow,
  timeRangesOverlap
};