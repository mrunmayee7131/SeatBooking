const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  department: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  phoneNumber: {
    type: String,
    required: true
  },
  locationPermissionGranted: {
    type: Boolean,
    default: false
  },
  lastKnownLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Method to update user location
userSchema.methods.updateLocation = function(latitude, longitude) {
  this.lastKnownLocation = {
    latitude,
    longitude,
    timestamp: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('User', userSchema);