const router = require('express').Router();
const Feedback = require('../models/Feedback');

// @route   POST /api/feedback
// @desc    Submit feedback/issue
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, restaurantName, email, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ message: 'Email and message are required' });
    }

    const newFeedback = new Feedback({
      name,
      restaurantName,
      email,
      message,
    });

    await newFeedback.save();

    res.status(201).json({ message: 'Feedback submitted successfully', feedback: newFeedback });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ message: 'Server error while submitting feedback' });
  }
});

module.exports = router;
