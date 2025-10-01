const mongoose = require('mongoose');
const Seat = require('./models/Seat');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-seat-booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Seed data
const seedSeats = async () => {
  try {
    // Clear existing seats
    await Seat.deleteMany({});
    console.log('Cleared existing seats');

    // Create seats for Floor 1
    const floor1Seats = [];
    
    // Section A - 20 seats
    for (let i = 1; i <= 20; i++) {
      floor1Seats.push({
        seatNumber: `A${i}`,
        floor: 1,
        section: 'A',
        status: 'available',
        hasCharging: i % 2 === 0, // Every alternate seat has charging
        hasLamp: true
      });
    }

    // Section B - 20 seats
    for (let i = 1; i <= 20; i++) {
      floor1Seats.push({
        seatNumber: `B${i}`,
        floor: 1,
        section: 'B',
        status: 'available',
        hasCharging: i % 3 === 0, // Every 3rd seat has charging
        hasLamp: true
      });
    }

    // Create seats for Floor 2
    const floor2Seats = [];
    
    // Section C - 25 seats
    for (let i = 1; i <= 25; i++) {
      floor2Seats.push({
        seatNumber: `C${i}`,
        floor: 2,
        section: 'C',
        status: 'available',
        hasCharging: i % 2 === 0,
        hasLamp: true
      });
    }

    // Section D - 25 seats
    for (let i = 1; i <= 25; i++) {
      floor2Seats.push({
        seatNumber: `D${i}`,
        floor: 2,
        section: 'D',
        status: 'available',
        hasCharging: true, // All seats have charging in premium section
        hasLamp: true
      });
    }

    // Create seats for Floor 3
    const floor3Seats = [];
    
    // Section E - 15 seats (Study rooms)
    for (let i = 1; i <= 15; i++) {
      floor3Seats.push({
        seatNumber: `E${i}`,
        floor: 3,
        section: 'E',
        status: 'available',
        hasCharging: true,
        hasLamp: true
      });
    }

    // Combine all seats
    const allSeats = [...floor1Seats, ...floor2Seats, ...floor3Seats];

    // Insert into database
    await Seat.insertMany(allSeats);

    console.log(`✅ Successfully seeded ${allSeats.length} seats!`);
    console.log(`
      Floor 1:
        - Section A: 20 seats
        - Section B: 20 seats
      Floor 2:
        - Section C: 25 seats
        - Section D: 25 seats (Premium - all with charging)
      Floor 3:
        - Section E: 15 seats (Study rooms)
      
      Total: ${allSeats.length} seats
    `);

    // Display sample seats
    const sampleSeats = await Seat.find().limit(5);
    console.log('\nSample seats:');
    sampleSeats.forEach(seat => {
      console.log(`- ${seat.seatNumber} (Floor ${seat.floor}, Section ${seat.section}) - ${seat.status}`);
    });

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the seed function
seedSeats();