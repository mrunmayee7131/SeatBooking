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
 * @returns {boolean} True if within radius
 */
function isWithinAttendanceRadius(userLat, userLon) {
  const distance = calculateDistance(
    userLat,
    userLon,
    LIBRARY_COORDINATES.latitude,
    LIBRARY_COORDINATES.longitude
  );

  const isWithin = distance <= ATTENDANCE_RADIUS_METERS;

  // DETAILED LOGGING FOR DEBUGGING
  console.log('========================================');
  console.log('📍 ATTENDANCE CHECK - DETAILED LOG');
  console.log('========================================');
  console.log('User Location:', {
    latitude: userLat,
    longitude: userLon
  });
  console.log('Library Location:', {
    latitude: LIBRARY_COORDINATES.latitude,
    longitude: LIBRARY_COORDINATES.longitude
  });
  console.log('Distance Calculation:');
  console.log(`  - Calculated Distance: ${Math.round(distance)} meters`);
  console.log(`  - Allowed Radius: ${ATTENDANCE_RADIUS_METERS} meters`);
  console.log(`  - Difference: ${Math.round(distance - ATTENDANCE_RADIUS_METERS)} meters ${distance > ATTENDANCE_RADIUS_METERS ? 'TOO FAR' : 'WITHIN RANGE'}`);
  console.log('Result:', isWithin ? '✅ WITHIN RADIUS - ALLOWED' : '❌ OUTSIDE RADIUS - DENIED');
  console.log('========================================\n');

  return isWithin;
}

/**
 * Get distance from library with detailed info
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

// Log configuration on startup with detailed info
console.log('\n🏛️  LIBRARY LOCATION SERVICE - CONFIGURATION');
console.log('=============================================');
console.log('Library Coordinates:');
console.log(`  Latitude:  ${LIBRARY_COORDINATES.latitude}`);
console.log(`  Longitude: ${LIBRARY_COORDINATES.longitude}`);
console.log(`Attendance Radius: ${ATTENDANCE_RADIUS_METERS} meters`);
console.log('Source: ' + (process.env.LIBRARY_LATITUDE ? '.env file' : 'default values'));
console.log('=============================================\n');

module.exports = {
  LIBRARY_COORDINATES,
  ATTENDANCE_RADIUS_METERS,
  calculateDistance,
  isWithinAttendanceRadius,
  getDistanceFromLibrary
};