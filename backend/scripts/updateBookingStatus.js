const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Booking = require('../models/Booking');

dotenv.config();

const updateExpiredBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const now = new Date();

    // Update all bookings where endTime has passed
    const result = await Booking.updateMany(
      {
        status: 'active',
        endTime: { $lt: now }
      },
      {
        $set: { status: 'completed' }
      }
    );

    console.log(`Updated ${result.modifiedCount} expired bookings to completed`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateExpiredBookings();