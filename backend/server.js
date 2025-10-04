const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI , {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
const seatRoutes = require('./routes/seats');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Restore pending bookings attendance checks on server restart
const Booking = require('./models/Booking');
const { scheduleAttendanceCheck } = require('./services/attendanceChecker');

async function restoreAttendanceChecks() {
  try {
    const now = new Date();
    const pendingBookings = await Booking.find({
      status: 'pending',
      attendanceConfirmed: false,
      date: { $gte: now }
    });

    console.log(`Restoring ${pendingBookings.length} attendance checks...`);

    for (const booking of pendingBookings) {
      scheduleAttendanceCheck(booking);
    }
  } catch (error) {
    console.error('Error restoring attendance checks:', error);
  }
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await restoreAttendanceChecks();
});

module.exports = app;