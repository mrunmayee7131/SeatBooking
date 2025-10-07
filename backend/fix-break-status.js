const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function fixBreakStatus() {
  try {
    console.log('🔧 Starting break status fix...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const bookingsCollection = db.collection('bookings');

    // Find all bookings with status 'on-break' but no currentBreak
    const brokenBookings = await bookingsCollection.find({
      status: 'on-break',
      $or: [
        { currentBreak: null },
        { currentBreak: { $exists: false } },
        { 'currentBreak.startTime': { $exists: false } }
      ]
    }).toArray();

    console.log(`\n📊 Found ${brokenBookings.length} bookings with incorrect 'on-break' status`);

    if (brokenBookings.length === 0) {
      console.log('✅ No bookings need fixing!');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Fix each broken booking
    let fixed = 0;
    for (const booking of brokenBookings) {
      // Determine correct status
      let newStatus = 'pending';
      if (booking.attendanceConfirmed) {
        newStatus = 'confirmed';
      }

      await bookingsCollection.updateOne(
        { _id: booking._id },
        { 
          $set: { 
            status: newStatus,
            currentBreak: null
          } 
        }
      );

      fixed++;
      console.log(`   Fixed booking ${booking._id}: ${booking.status} -> ${newStatus}`);
    }

    console.log(`\n✅ Successfully fixed ${fixed} bookings!`);
    console.log('💡 You can now use the break feature properly.');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing break status:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixBreakStatus();