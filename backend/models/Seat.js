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
  bookings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    bookedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'on-break'],
      default: 'active'
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure unique seat numbers per location
seatSchema.index({ seatNumber: 1, location: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);