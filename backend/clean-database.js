const mongoose = require('mongoose');
require('dotenv').config();

async function cleanDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-seat-booking');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🗑️  Cleaning database...');
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();
    
    if (collections.length === 0) {
      console.log('ℹ️  Database is already empty');
    } else {
      // Drop each collection
      for (let collection of collections) {
        await collection.drop();
        console.log(`  ✓ Dropped: ${collection.collectionName}`);
      }
      console.log(`\n✅ Dropped ${collections.length} collection(s)`);
    }
    
    console.log('\n🎉 Database cleaned successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Run: npm run seed');
    console.log('  2. Run: npm run dev');
    console.log('  3. Register new users in the app\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error cleaning database:', error.message);
    process.exit(1);
  }
}

cleanDatabase();