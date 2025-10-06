const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'expired'],
    default: 'pending'
  },
  attendanceConfirmed: {
    type: Boolean,
    default: false
  },
  attendanceConfirmedAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  autoCheckScheduled: {
    type: Boolean,
    default: false
  },
  deviceFingerprint: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
bookingSchema.index({ user: 1, date: 1 });
bookingSchema.index({ seat: 1, date: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ attendanceConfirmed: 1, startTime: 1 });
bookingSchema.index({ deviceFingerprint: 1, date: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);