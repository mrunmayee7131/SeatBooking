const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { getDistanceFromLibrary } = require('../utils/locationUtils');

const router = express.Router();

// Update user location
router.post('/update-location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Latitude and longitude are required' 
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    await user.updateLocation(latitude, longitude);

    const distance = getDistanceFromLibrary(latitude, longitude);

    res.json({
      message: 'Location updated successfully',
      location: {
        latitude,
        longitude,
        timestamp: user.lastKnownLocation.timestamp
      },
      distanceFromLibrary: Math.round(distance)
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ 
      message: 'Error updating location' 
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching profile' 
    });
  }
});

module.exports = router;