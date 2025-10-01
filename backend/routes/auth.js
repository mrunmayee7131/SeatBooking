const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, rollNumber, department, year, phoneNumber } = req.body;

    // Validate required fields
    if (!name || !email || !password || !rollNumber || !department || !year || !phoneNumber) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { rollNumber }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or roll number already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      rollNumber,
      department,
      year,
      phoneNumber,
      locationPermissionGranted: false
    });

    await user.save();

    res.status(201).json({ 
      message: 'User registered successfully. Please grant location permission to complete setup.',
      userId: user._id,
      requiresLocationPermission: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error registering user' 
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check location permission
    if (!user.locationPermissionGranted) {
      return res.status(403).json({ 
        message: 'Location permission required. Please grant location access to use the system.',
        requiresLocationPermission: true,
        userId: user._id
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        department: user.department,
        year: user.year
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error logging in' 
    });
  }
});

// Update location permission
router.post('/grant-location-permission', async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        message: 'User ID is required' 
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Location coordinates are required' 
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    user.locationPermissionGranted = true;
    user.lastKnownLocation = {
      latitude,
      longitude,
      timestamp: new Date()
    };

    await user.save();

    // Generate JWT token after permission granted
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Location permission granted successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        department: user.department,
        year: user.year
      }
    });
  } catch (error) {
    console.error('Location permission error:', error);
    res.status(500).json({ 
      message: 'Error granting location permission' 
    });
  }
});

module.exports = router;