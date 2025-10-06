const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

async function migrateBookings() {
  try {
    console.log('Starting migration to add deviceFingerprint to existing bookings...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');

    // Use native MongoDB driver to bypass Mongoose validation
    const db = mongoose.connection.db;
    const bookingsCollection = db.collection('bookings');

    // Find all bookings without deviceFingerprint
    const bookingsWithoutFingerprint = await bookingsCollection.find({
      $or: [
        { deviceFingerprint: { $exists: false } },
        { deviceFingerprint: null },
        { deviceFingerprint: '' }
      ]
    }).toArray();

    console.log(`Found ${bookingsWithoutFingerprint.length} bookings without device fingerprint`);

    if (bookingsWithoutFingerprint.length === 0) {
      console.log('No bookings need migration. All bookings already have device fingerprints.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Update each booking with a placeholder fingerprint
    let updated = 0;
    for (const booking of bookingsWithoutFingerprint) {
      // Generate a unique fingerprint based on user and timestamp
      const placeholderData = `${booking.user}-${booking.createdAt || new Date()}-${Math.random()}`;
      const fingerprint = crypto.createHash('sha256').update(placeholderData).digest('hex');
      
      // Update directly in MongoDB without validation
      await bookingsCollection.updateOne(
        { _id: booking._id },
        { $set: { deviceFingerprint: fingerprint } }
      );
      
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`Updated ${updated} bookings...`);
      }
    }

    console.log(`✅ Migration completed! Updated ${updated} bookings with device fingerprints.`);
    console.log('Note: Existing bookings have been assigned placeholder fingerprints.');
    console.log('New bookings will use actual device fingerprints.');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateBookings();