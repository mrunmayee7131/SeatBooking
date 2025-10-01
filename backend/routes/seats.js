const express = require('express');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all seats
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { floor, section, status } = req.query;
    
    const filter = {};
    if (floor) filter.floor = parseInt(floor);
    if (section) filter.section = section;
    if (status) filter.status = status;

    const seats = await Seat.find(filter).sort({ floor: 1, seatNumber: 1 });
    
    res.json({ seats });
  } catch (error) {
    console.error('Error fetching seats:', error);
    res.status(500).json({ 
      message: 'Error fetching seats' 
    });
  }
});

// Get available seats for a specific date and time
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'Date, start time, and end time are required' 
      });
    }

    // Get all available seats
    const allSeats = await Seat.find({ status: 'available' });

    // Find seats that are not booked for the specified time slot
    const bookingDate = new Date(date);
    const bookedSeats = await Booking.find({
      date: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
      },
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    }).distinct('seat');

    const availableSeats = allSeats.filter(
      seat => !bookedSeats.some(bookedSeatId => bookedSeatId.equals(seat._id))
    );

    res.json({ seats: availableSeats });
  } catch (error) {
    console.error('Error fetching available seats:', error);
    res.status(500).json({ 
      message: 'Error fetching available seats' 
    });
  }
});

// Get seat by ID
router.get('/:seatId', authenticateToken, async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.seatId);

    if (!seat) {
      return res.status(404).json({ 
        message: 'Seat not found' 
      });
    }

    res.json({ seat });
  } catch (error) {
    console.error('Error fetching seat:', error);
    res.status(500).json({ 
      message: 'Error fetching seat' 
    });
  }
});

// Admin: Create new seat (you can add admin middleware here)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { seatNumber, floor, section, hasCharging, hasLamp } = req.body;

    if (!seatNumber || !floor || !section) {
      return res.status(400).json({ 
        message: 'Seat number, floor, and section are required' 
      });
    }

    const existingSeat = await Seat.findOne({ seatNumber });
    if (existingSeat) {
      return res.status(400).json({ 
        message: 'Seat with this number already exists' 
      });
    }

    const seat = new Seat({
      seatNumber,
      floor,
      section,
      hasCharging: hasCharging || false,
      hasLamp: hasLamp || false
    });

    await seat.save();

    res.status(201).json({
      message: 'Seat created successfully',
      seat
    });
  } catch (error) {
    console.error('Error creating seat:', error);
    res.status(500).json({ 
      message: 'Error creating seat' 
    });
  }
});

// Admin: Update seat status
router.patch('/:seatId', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['available', 'occupied', 'maintenance'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status' 
      });
    }

    const seat = await Seat.findById(req.params.seatId);

    if (!seat) {
      return res.status(404).json({ 
        message: 'Seat not found' 
      });
    }

    seat.status = status;
    await seat.save();

    res.json({
      message: 'Seat status updated successfully',
      seat
    });
  } catch (error) {
    console.error('Error updating seat:', error);
    res.status(500).json({ 
      message: 'Error updating seat' 
    });
  }
});

// Admin: Delete seat
router.delete('/:seatId', authenticateToken, async (req, res) => {
  try {
    const seat = await Seat.findByIdAndDelete(req.params.seatId);

    if (!seat) {
      return res.status(404).json({ 
        message: 'Seat not found' 
      });
    }

    res.json({ 
      message: 'Seat deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting seat:', error);
    res.status(500).json({ 
      message: 'Error deleting seat' 
    });
  }
});

module.exports = router;