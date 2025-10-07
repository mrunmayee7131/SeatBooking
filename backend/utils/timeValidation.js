/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Validate if booking times are within allowed window (8 AM - 6 PM)
 */
function validateBookingWindow(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // 8 AM = 480 minutes, 6 PM = 1080 minutes, 1 AM = 60 minutes
  const windowStart = 8 * 60; // 8 AM
  const windowEnd = 18 * 60;   // 6 PM
  const midnightCutoff = 1 * 60; // 1 AM next day

  // Allow bookings from 8 AM to 6 PM, or extending past midnight until 1 AM
  const isStartValid = startMinutes >= windowStart && startMinutes < 24 * 60;
  const isEndValid = (endMinutes >= windowStart && endMinutes <= 24 * 60) || 
                     (endMinutes <= midnightCutoff);

  if (!isStartValid || !isEndValid) {
    return {
      isValid: false,
      message: 'Bookings must be between 8:00 AM and 6:00 PM (can extend to 1:00 AM next day)'
    };
  }

  // Ensure end time is after start time
  if (endMinutes <= startMinutes && endMinutes > midnightCutoff) {
    return {
      isValid: false,
      message: 'End time must be after start time'
    };
  }

  return { isValid: true };
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(start1, end1, start2, end2) {
  const start1Minutes = timeToMinutes(start1);
  let end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  let end2Minutes = timeToMinutes(end2);

  // Handle times that cross midnight (e.g., 23:00 to 01:00)
  // If end time is less than start time, it means it crosses midnight
  if (end1Minutes < start1Minutes) {
    end1Minutes += 24 * 60; // Add 24 hours worth of minutes
  }
  if (end2Minutes < start2Minutes) {
    end2Minutes += 24 * 60;
  }

  // Check for overlap
  // Two ranges overlap if: start1 < end2 AND start2 < end1
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}

/**
 * Calculate duration in minutes between two times
 */
function calculateDuration(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // Handle times that cross midnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

/**
 * Check if a time is within a given time range
 */
function isTimeInRange(time, rangeStart, rangeEnd) {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(rangeStart);
  let endMinutes = timeToMinutes(rangeEnd);

  // Handle times that cross midnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

module.exports = {
  timeToMinutes,
  validateBookingWindow,
  timeRangesOverlap,
  calculateDuration,
  isTimeInRange
};