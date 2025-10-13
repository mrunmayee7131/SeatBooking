const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  floor: {
    type: Number,
    required: true,
    min: 1
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'reserved', 'on-break'],
    default: 'available'
  },
  amenities: {
    type: [String],
    default: []
  },
  hasCharging: {
    type: Boolean,
    default: false
  },
  hasLamp: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
seatSchema.index({ status: 1 });
seatSchema.index({ floor: 1, section: 1 });

module.exports = mongoose.model('Seat', seatSchema);