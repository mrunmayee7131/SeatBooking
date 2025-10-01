// Location utility functions

// Library seat coordinates
const LIBRARY_COORDINATES = {
  latitude: 25.262016,
  longitude: 82.989052
};

const ATTENDANCE_RADIUS_METERS = 100; // 100 meters radius

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance;
}

/**
 * Check if user is within attendance radius of library
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @returns {boolean} True if within radius
 */
function isWithinAttendanceRadius(userLat, userLon) {
  const distance = calculateDistance(
    userLat,
    userLon,
    LIBRARY_COORDINATES.latitude,
    LIBRARY_COORDINATES.longitude
  );
  
  return distance <= ATTENDANCE_RADIUS_METERS;
}

/**
 * Get distance from library
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @returns {number} Distance in meters
 */
function getDistanceFromLibrary(userLat, userLon) {
  return calculateDistance(
    userLat,
    userLon,
    LIBRARY_COORDINATES.latitude,
    LIBRARY_COORDINATES.longitude
  );
}

module.exports = {
  LIBRARY_COORDINATES,
  ATTENDANCE_RADIUS_METERS,
  calculateDistance,
  isWithinAttendanceRadius,
  getDistanceFromLibrary
};