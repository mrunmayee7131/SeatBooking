// Location utility functions

// Get library coordinates from environment variables or use defaults
const LIBRARY_COORDINATES = {
  latitude: parseFloat(process.env.LIBRARY_LATITUDE) || 25.261071,
  longitude: parseFloat(process.env.LIBRARY_LONGITUDE) || 82.983812
};

const ATTENDANCE_RADIUS_METERS = parseInt(process.env.ATTENDANCE_RADIUS_METERS) || 100;

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
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance;
}

/**
 * Check if user is within attendance radius of library
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @returns {object} Result with isWithin boolean and distance
 */
function isWithinAttendanceRadius(userLat, userLon) {
  const distance = calculateDistance(
    userLat,
    userLon,
    LIBRARY_COORDINATES.latitude,
    LIBRARY_COORDINATES.longitude
  );

  console.log('📍 Attendance Check:', {
    userLocation: { lat: userLat, lon: userLon },
    libraryLocation: LIBRARY_COORDINATES,
    calculatedDistance: Math.round(distance),
    allowedRadius: ATTENDANCE_RADIUS_METERS,
    isWithin: distance <= ATTENDANCE_RADIUS_METERS
  });

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

// Log configuration on startup
console.log('🏛️ Library Location Configuration:', {
  coordinates: LIBRARY_COORDINATES,
  radius: `${ATTENDANCE_RADIUS_METERS} meters`
});

module.exports = {
  LIBRARY_COORDINATES,
  ATTENDANCE_RADIUS_METERS,
  calculateDistance,
  isWithinAttendanceRadius,
  getDistanceFromLibrary
};