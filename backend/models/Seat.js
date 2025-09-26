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
  isBooked: {
    type: Boolean,
    default: false
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  bookedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to ensure unique seat numbers per location
seatSchema.index({ seatNumber: 1, location: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);