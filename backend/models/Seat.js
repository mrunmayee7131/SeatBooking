const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true,
    enum: ['Main Library', 'Reading Hall 1', 'Reading Hall 2']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available'
  },
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  }
}, {
  timestamps: true
});

// Compound index for unique seat per location
seatSchema.index({ seatNumber: 1, location: 1 }, { unique: true });
seatSchema.index({ status: 1 });
seatSchema.index({ location: 1 });

module.exports = mongoose.model('Seat', seatSchema);