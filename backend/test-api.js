// API Testing Script
// Run with: node test-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let userId = '';
let bookingId = '';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@university.edu',
  password: 'test123',
  rollNumber: 'TEST001',
  department: 'Computer Science',
  year: 3,
  phoneNumber: '1234567890'
};

const testLocation = {
  latitude: 25.262016,  // Library location
  longitude: 82.989052
};

// Helper function for API calls
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Test functions
async function test1_register() {
  console.log('\n🧪 Test 1: Register User');
  try {
    const response = await api.post('/auth/register', testUser);
    console.log('✅ Registration successful');
    console.log('Response:', response.data);
    userId = response.data.userId;
    return true;
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message);
    return false;
  }
}

async function test2_grantLocationPermission() {
  console.log('\n🧪 Test 2: Grant Location Permission');
  try {
    const response = await api.post('/auth/grant-location-permission', {
      userId,
      ...testLocation
    });
    console.log('✅ Location permission granted');
    authToken = response.data.token;
    console.log('Token received:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.log('❌ Location permission failed:', error.response?.data?.message);
    return false;
  }
}

async function test3_updateLocation() {
  console.log('\n🧪 Test 3: Update User Location');
  try {
    const response = await api.post('/users/update-location', testLocation);
    console.log('✅ Location updated');
    console.log('Distance from library:', response.data.distanceFromLibrary, 'meters');
    return true;
  } catch (error) {
    console.log('❌ Location update failed:', error.response?.data?.message);
    return false;
  }
}

async function test4_getAvailableSeats() {
  console.log('\n🧪 Test 4: Get Available Seats');
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get('/seats/available', {
      params: {
        date: today,
        startTime: '14:00',
        endTime: '17:00'
      }
    });
    console.log('✅ Available seats fetched');
    console.log(`Found ${response.data.seats.length} available seats`);
    if (response.data.seats.length > 0) {
      console.log('Sample seat:', response.data.seats[0].seatNumber);
    }
    return response.data.seats[0]?._id;
  } catch (error) {
    console.log('❌ Failed to get available seats:', error.response?.data?.message);
    return null;
  }
}

async function test5_bookSeat(seatId) {
  console.log('\n🧪 Test 5: Book a Seat');
  try {
    const now = new Date();
    const startTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const endHour = now.getHours() + 3;
    const endTime = `${endHour}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const response = await api.post('/bookings/book', {
      seatId,
      date: new Date().toISOString(),
      startTime,
      endTime
    });
    console.log('✅ Seat booked successfully');
    console.log('Booking ID:', response.data.booking._id);
    console.log('⚠️  Remember: Confirm attendance within 20 minutes!');
    bookingId = response.data.booking._id;
    return true;
  } catch (error) {
    console.log('❌ Booking failed:', error.response?.data?.message);
    return false;
  }
}

async function test6_getMyBookings() {
  console.log('\n🧪 Test 6: Get My Bookings');
  try {
    const response = await api.get('/bookings/my-bookings');
    console.log('✅ Bookings fetched');
    console.log(`Total bookings: ${response.data.bookings.length}`);
    response.data.bookings.forEach((booking, index) => {
      console.log(`  ${index + 1}. Seat ${booking.seat?.seatNumber} - ${booking.status}`);
    });
    return true;
  } catch (error) {
    console.log('❌ Failed to get bookings:', error.response?.data?.message);
    return false;
  }
}

async function test7_confirmAttendance() {
  console.log('\n🧪 Test 7: Confirm Attendance');
  try {
    const response = await api.post(`/bookings/confirm-attendance/${bookingId}`, testLocation);
    console.log('✅ Attendance confirmed');
    console.log('Status:', response.data.booking.status);
    console.log('Attendance confirmed at:', response.data.booking.attendanceConfirmedAt);
    return true;
  } catch (error) {
    console.log('❌ Attendance confirmation failed:', error.response?.data?.message);
    return false;
  }
}

async function test8_loginExistingUser() {
  console.log('\n🧪 Test 8: Login with Existing User');
  try {
    const response = await api.post('/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful');
    authToken = response.data.token;
    console.log('User:', response.data.user.name);
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message);
    return false;
  }
}

async function test9_testDistanceCheck() {
  console.log('\n🧪 Test 9: Test Distance Check (Outside Radius)');
  try {
    // Use a location far from library
    const farLocation = {
      latitude: 25.270000,  // About 1km away
      longitude: 82.990000
    };
    
    // Update location first
    await api.post('/users/update-location', farLocation);
    
    // Try to confirm attendance
    const response = await api.post(`/bookings/confirm-attendance/${bookingId}`, farLocation);
    console.log('❌ Should have failed but succeeded');
    return false;
  } catch (error) {
    if (error.response?.data?.message.includes('not within required distance')) {
      console.log('✅ Distance check working correctly');
      console.log('Error message:', error.response.data.message);
      return true;
    }
    console.log('❌ Unexpected error:', error.response?.data?.message);
    return false;
  }
}

async function test10_cancelBooking(testBookingId) {
  console.log('\n🧪 Test 10: Cancel Booking');
  try {
    const response = await api.delete(`/bookings/${testBookingId}`);
    console.log('✅ Booking cancelled');
    console.log('Message:', response.data.message);
    return true;
  } catch (error) {
    console.log('❌ Cancellation failed:', error.response?.data?.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting API Tests for Library Seat Booking System');
  console.log('================================================');
  
  let seatId = null;
  let testBookingId = null;
  
  // Run tests sequentially
  await test1_register();
  await test2_grantLocationPermission();
  await test3_updateLocation();
  
  seatId = await test4_getAvailableSeats();
  
  if (seatId) {
    await test5_bookSeat(seatId);
    await test6_getMyBookings();
    
    // Wait a few seconds before confirming attendance
    console.log('\n⏳ Waiting 3 seconds before confirming attendance...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await test7_confirmAttendance();
    
    // Test with wrong location
    await test9_testDistanceCheck();
    
    // Book another seat for cancellation test
    console.log('\n⏳ Creating another booking for cancellation test...');
    const anotherSeatId = await test4_getAvailableSeats();
    if (anotherSeatId && anotherSeatId !== seatId) {
      await test5_bookSeat(anotherSeatId);
      await test6_getMyBookings();
      
      // Get the latest booking for cancellation
      const bookingsResponse = await api.get('/bookings/my-bookings');
      const latestBooking = bookingsResponse.data.bookings.find(b => b.status !== 'cancelled');
      if (latestBooking) {
        await test10_cancelBooking(latestBooking._id);
      }
    }
  }
  
  // Test login
  authToken = ''; // Clear token
  await test8_loginExistingUser();
  await test6_getMyBookings();
  
  console.log('\n================================================');
  console.log('✅ All tests completed!');
  console.log('\n📋 Summary:');
  console.log('- User registration with location permission');
  console.log('- Location updates and tracking');
  console.log('- Seat booking and availability');
  console.log('- Attendance confirmation (within radius)');
  console.log('- Distance validation (outside radius)');
  console.log('- Booking cancellation');
  console.log('- User authentication');
  console.log('\n💡 Tips:');
  console.log('- Check server logs for attendance scheduling');
  console.log('- Wait 20+ minutes to see auto-cancellation');
  console.log('- Monitor location updates in console');
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});