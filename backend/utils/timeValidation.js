/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Validate if booking times are valid (24/7 booking allowed)
 */
function validateBookingWindow(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // CHANGED: Allow 24/7 booking - No time restrictions!
  // Users can book any time of day, any day of the week
  
  // Only validation: Ensure end time is after start time
  // Handle times that cross midnight (e.g., 23:00 to 02:00)
  if (startMinutes === endMinutes) {
    return {
      isValid: false,
      message: 'Start time and end time cannot be the same'
    };
  }

  // If end time is less than start time, it means booking crosses midnight
  // This is allowed (e.g., 11 PM to 2 AM next day)
  // We just need to ensure it's not the same time
  
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