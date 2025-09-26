const Seat = require('../models/Seat');

// @desc    Get all seats for a specific location
// @route   GET /api/seats/:location
// @access  Private
exports.getSeats = async (req, res) => {
  try {
    const { location } = req.params;
    
    const seats = await Seat.find({ location }).populate('bookedBy', 'name email');
    
    res.json(seats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Book a seat
// @route   POST /api/seats/book
// @access  Private
exports.bookSeat = async (req, res) => {
  try {
    const { seatId } = req.body;
    const userId = req.user.id;

    // Find the seat
    const seat = await Seat.findById(seatId);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // Check if seat is already booked
    if (seat.isBooked) {
      return res.status(400).json({ message: 'Seat is already booked' });
    }

    // Check if user already has a booked seat
    const existingBooking = await Seat.findOne({ bookedBy: userId, isBooked: true });
    if (existingBooking) {
      return res.status(400).json({ 
        message: 'You already have a seat booked. Please cancel it before booking another.' 
      });
    }

    // Book the seat
    seat.isBooked = true;
    seat.bookedBy = userId;
    seat.bookedAt = new Date();
    await seat.save();

    const bookedSeat = await Seat.findById(seatId).populate('bookedBy', 'name email');

    res.json({ 
      message: 'Seat booked successfully', 
      seat: bookedSeat 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Cancel seat booking
// @route   POST /api/seats/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const { seatId } = req.body;
    const userId = req.user.id;

    const seat = await Seat.findById(seatId);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // Check if the seat is booked by the current user
    if (seat.bookedBy.toString() !== userId) {
      return res.status(403).json({ message: 'You can only cancel your own booking' });
    }

    // Cancel the booking
    seat.isBooked = false;
    seat.bookedBy = null;
    seat.bookedAt = null;
    await seat.save();

    res.json({ message: 'Booking cancelled successfully', seat });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's current booking
// @route   GET /api/seats/my-booking
// @access  Private
exports.getMyBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const booking = await Seat.findOne({ bookedBy: userId, isBooked: true });
    
    if (!booking) {
      return res.json({ booking: null });
    }

    res.json({ booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};