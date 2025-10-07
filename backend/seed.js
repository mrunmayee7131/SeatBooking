const mongoose = require('mongoose');
const Seat = require('./models/Seat');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Seed data for three locations
const seedSeats = async () => {
  try {
    // Clear existing seats
    await Seat.deleteMany({});
    console.log('✅ Cleared existing seats');

    const allSeats = [];

    // ========================================
    // READING HALL 1 - Section A, Floor 1
    // ========================================
    console.log('\n📚 Creating Reading Hall 1 seats (Section A, Floor 1)...');
    for (let i = 1; i <= 30; i++) {
      allSeats.push({
        seatNumber: `A${i}`,
        floor: 1,
        section: 'A',
        status: 'available',
        hasCharging: i % 3 === 0, // Every 3rd seat has charging
        hasLamp: true
      });
    }

    // ========================================
    // READING HALL 2 - Section B, Floor 1
    // ========================================
    console.log('📖 Creating Reading Hall 2 seats (Section B, Floor 1)...');
    for (let i = 1; i <= 30; i++) {
      allSeats.push({
        seatNumber: `B${i}`,
        floor: 1,
        section: 'B',
        status: 'available',
        hasCharging: i % 2 === 0, // Every 2nd seat has charging
        hasLamp: true
      });
    }

    // ========================================
    // MAIN LIBRARY - Section C, Floor 2
    // ========================================
    console.log('🏛️  Creating Main Library seats (Section C, Floor 2)...');
    for (let i = 1; i <= 40; i++) {
      allSeats.push({
        seatNumber: `C${i}`,
        floor: 2,
        section: 'C',
        status: 'available',
        hasCharging: true, // Premium - all seats have charging
        hasLamp: true
      });
    }

    // Insert all seats
    await Seat.insertMany(allSeats);

    console.log(`\n✅ Successfully seeded ${allSeats.length} seats!`);
    console.log(`
╔════════════════════════════════════════════╗
║        SEAT DISTRIBUTION SUMMARY           ║
╠════════════════════════════════════════════╣
║                                            ║
║  📚 READING HALL 1 (Ground Floor)          ║
║     Section: A | Floor: 1                  ║
║     Seats: 30 | Charging: 10               ║
║     Description: Quiet Study Area          ║
║                                            ║
║  📖 READING HALL 2 (Ground Floor)          ║
║     Section: B | Floor: 1                  ║
║     Seats: 30 | Charging: 15               ║
║     Description: Group Study Area          ║
║                                            ║
║  🏛️  MAIN LIBRARY (First Floor)           ║
║     Section: C | Floor: 2                  ║
║     Seats: 40 | Charging: 40               ║
║     Description: Premium Seating           ║
║                                            ║
║  TOTAL SEATS: ${allSeats.length}                         ║
║  TOTAL CHARGING PORTS: ${allSeats.filter(s => s.hasCharging).length}                 ║
║                                            ║
╚════════════════════════════════════════════╝
    `);

    // Display sample seats from each location
    console.log('\n📋 Sample seats from each location:\n');
    
    const sampleA = await Seat.find({ section: 'A' }).limit(3);
    console.log('📚 Reading Hall 1:');
    sampleA.forEach(seat => {
      console.log(`   ${seat.seatNumber} - ${seat.hasCharging ? '🔌' : '  '} ${seat.hasLamp ? '💡' : '  '}`);
    });

    const sampleB = await Seat.find({ section: 'B' }).limit(3);
    console.log('\n📖 Reading Hall 2:');
    sampleB.forEach(seat => {
      console.log(`   ${seat.seatNumber} - ${seat.hasCharging ? '🔌' : '  '} ${seat.hasLamp ? '💡' : '  '}`);
    });

    const sampleC = await Seat.find({ section: 'C' }).limit(3);
    console.log('\n🏛️  Main Library:');
    sampleC.forEach(seat => {
      console.log(`   ${seat.seatNumber} - ${seat.hasCharging ? '🔌' : '  '} ${seat.hasLamp ? '💡' : '  '}`);
    });

    console.log('\n✨ Database seeding completed successfully!');
    console.log('🚀 You can now start the server and begin booking seats.\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
};

// Run the seed function
console.log('🌱 Starting database seeding...\n');
seedSeats();