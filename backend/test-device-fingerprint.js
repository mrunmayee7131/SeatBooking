const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

let authToken = '';

// Set auth token for requests
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Test user credentials
const testUser = {
  name: 'Device Test User',
  email: `devicetest${Date.now()}@example.com`,
  password: 'Test123456',
  rollNumber: `DT${Date.now()}`,
  department: 'Computer Science',
  year: 3,
  phoneNumber: '9876543210'
};

const testLocation = {
  latitude: 25.261071,
  longitude: 82.983812
};

console.log('🧪 Testing Device Fingerprinting Feature');
console.log('========================================\n');

async function test1_register() {
  console.log('📝 Test 1: Register new user');
  try {
    const response = await api.post('/auth/register', testUser);
    console.log('✅ Registration successful');
    console.log('User ID:', response.data.userId);
    return response.data.userId;
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message);
    return null;
  }
}

async function test2_grantLocation(userId) {
  console.log('\n📍 Test 2: Grant location permission');
  try {
    const response = await api.post('/auth/grant-location-permission', {
      userId,
      ...testLocation
    });
    authToken = response.data.token;
    console.log('✅ Location permission granted');
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.message);
    return false;
  }
}

async function test3_bookingWindowValidation() {
  console.log('\n⏰ Test 3: Validate booking window (8 AM - 6 PM)');
  
  // Get available seats
  const seatsResponse = await api.get('/seats');
  const seatId = seatsResponse.data.seats[0]?._id;
  
  if (!seatId) {
    console.log('❌ No seats available for testing');
    return false;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  // Test 1: Try booking before 8 AM (should fail)
  try {
    await api.post('/bookings/book', {
      seatId,
      date: dateStr,
      startTime: '07:00',
      endTime: '09:00'
    });
    console.log('❌ Should have rejected booking before 8 AM');
    return false;
  } catch (error) {
    if (error.response?.data?.message.includes('between')) {
      console.log('✅ Correctly rejected booking before 8 AM');
    }
  }

  // Test 2: Try booking after 6 PM (should fail)
  try {
    await api.post('/bookings/book', {
      seatId,
      date: dateStr,
      startTime: '17:00',
      endTime: '19:00'
    });
    console.log('❌ Should have rejected booking after 6 PM');
    return false;
  } catch (error) {
    if (error.response?.data?.message.includes('between')) {
      console.log('✅ Correctly rejected booking after 6 PM');
    }
  }

  // Test 3: Valid booking within window (should succeed)
  try {
    await api.post('/bookings/book', {
      seatId,
      date: dateStr,
      startTime: '10:00',
      endTime: '14:00'
    });
    console.log('✅ Valid booking within window accepted');
    return true;
  } catch (error) {
    console.log('❌ Valid booking rejected:', error.response?.data?.message);
    return false;
  }
}

async function test4_overlappingBookings() {
  console.log('\n🔄 Test 4: Prevent overlapping bookings from same device');
  
  const seatsResponse = await api.get('/seats');
  const seats = seatsResponse.data.seats;
  
  if (seats.length < 2) {
    console.log('❌ Need at least 2 seats for this test');
    return false;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const dateStr = tomorrow.toISOString().split('T')[0];

  // First booking: 11 AM - 4 PM
  try {
    const response = await api.post('/bookings/book', {
      seatId: seats[0]._id,
      date: dateStr,
      startTime: '11:00',
      endTime: '16:00'
    });
    console.log('✅ First booking created (11:00 - 16:00)');
    console.log('   Seat:', response.data.booking.seat.seatNumber);
  } catch (error) {
    console.log('❌ First booking failed:', error.response?.data?.message);
    return false;
  }

  // Try overlapping bookings from same device (should all fail)
  const overlappingTests = [
    { start: '10:00', end: '13:00', description: '10:00-13:00 (overlaps start)' },
    { start: '12:00', end: '15:00', description: '12:00-15:00 (completely within)' },
    { start: '14:00', end: '17:00', description: '14:00-17:00 (overlaps end)' },
    { start: '09:00', end: '17:00', description: '09:00-17:00 (encompasses)' }
  ];

  for (const test of overlappingTests) {
    try {
      await api.post('/bookings/book', {
        seatId: seats[1]._id,
        date: dateStr,
        startTime: test.start,
        endTime: test.end
      });
      console.log(`❌ Should have rejected ${test.description}`);
      return false;
    } catch (error) {
      if (error.response?.data?.message.includes('already have a booking')) {
        console.log(`✅ Correctly rejected ${test.description}`);
      } else {
        console.log(`❌ Wrong error for ${test.description}:`, error.response?.data?.message);
      }
    }
  }

  // Try non-overlapping booking (should succeed)
  try {
    await api.post('/bookings/book', {
      seatId: seats[1]._id,
      date: dateStr,
      startTime: '08:00',
      endTime: '10:00'
    });
    console.log('✅ Non-overlapping booking allowed (08:00-10:00)');
    return true;
  } catch (error) {
    console.log('❌ Non-overlapping booking rejected:', error.response?.data?.message);
    return false;
  }
}

async function test5_viewBookings() {
  console.log('\n📋 Test 5: View all bookings');
  try {
    const response = await api.get('/bookings/my-bookings');
    console.log('✅ Retrieved bookings');
    console.log(`   Total bookings: ${response.data.bookings.length}`);
    
    response.data.bookings.forEach((booking, index) => {
      console.log(`   ${index + 1}. ${booking.seat.seatNumber}: ${booking.startTime} - ${booking.endTime} (${booking.status})`);
    });
    
    return true;
  } catch (error) {
    console.log('❌ Failed to retrieve bookings:', error.response?.data?.message);
    return false;
  }
}

async function test6_cancelAndRebook() {
  console.log('\n🔄 Test 6: Cancel booking and verify re-booking allowed');
  
  try {
    // Get user's bookings
    const response = await api.get('/bookings/my-bookings');
    const activeBooking = response.data.bookings.find(b => b.status !== 'cancelled');
    
    if (!activeBooking) {
      console.log('❌ No active booking to cancel');
      return false;
    }

    console.log(`   Cancelling booking: ${activeBooking.seat.seatNumber} (${activeBooking.startTime}-${activeBooking.endTime})`);
    
    // Cancel the booking
    await api.delete(`/bookings/${activeBooking._id}`);
    console.log('✅ Booking cancelled successfully');
    
    // Try to book in the same time slot again (should now succeed)
    const tomorrow = new Date(activeBooking.date);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const seatsResponse = await api.get('/seats');
    const newSeatId = seatsResponse.data.seats[0]._id;
    
    await api.post('/bookings/book', {
      seatId: newSeatId,
      date: dateStr,
      startTime: activeBooking.startTime,
      endTime: activeBooking.endTime
    });
    
    console.log('✅ Re-booking in same time slot allowed after cancellation');
    return true;
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Device Fingerprinting Tests\n');
  
  let userId = null;
  let testsPassed = 0;
  let totalTests = 6;
  
  // Test 1: Register
  userId = await test1_register();
  if (userId) testsPassed++;
  
  if (!userId) {
    console.log('\n❌ Cannot continue without user registration');
    return;
  }
  
  // Test 2: Grant location
  if (await test2_grantLocation(userId)) testsPassed++;
  
  // Test 3: Booking window validation
  if (await test3_bookingWindowValidation()) testsPassed++;
  
  // Test 4: Overlapping bookings prevention
  if (await test4_overlappingBookings()) testsPassed++;
  
  // Test 5: View bookings
  if (await test5_viewBookings()) testsPassed++;
  
  // Test 6: Cancel and rebook
  if (await test6_cancelAndRebook()) testsPassed++;
  
  // Summary
  console.log('\n========================================');
  console.log('📊 Test Summary');
  console.log('========================================');
  console.log(`Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`Success Rate: ${((testsPassed/totalTests) * 100).toFixed(1)}%`);
  
  if (testsPassed === totalTests) {
    console.log('✅ All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});