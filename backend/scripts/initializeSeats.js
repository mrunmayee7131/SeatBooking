const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Seat = require('../models/Seat');

dotenv.config();

const initializeSeats = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    // Clear existing seats
    await Seat.deleteMany({});

    const seats = [];

    // Create 50 seats for Main Library
    for (let i = 1; i <= 50; i++) {
      seats.push({
        seatNumber: i,
        location: 'Main Library',
        bookings: []
      });
    }

    // Create 50 seats for Reading Hall 1
    for (let i = 1; i <= 50; i++) {
      seats.push({
        seatNumber: i,
        location: 'Reading Hall 1',
        bookings: []
      });
    }

    // Create 50 seats for Reading Hall 2
    for (let i = 1; i <= 50; i++) {
      seats.push({
        seatNumber: i,
        location: 'Reading Hall 2',
        bookings: []
      });
    }

    await Seat.insertMany(seats);
    console.log('Seats initialized successfully!');
    console.log(`Total seats created: ${seats.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

initializeSeats();