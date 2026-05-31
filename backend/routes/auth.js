const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@smartqr.app';

// Register restaurant
router.post('/register', async (req, res) => {
  try {
    const { name, adminEmail, adminPassword, description, address, phone } = req.body;
    if (!name || !adminEmail || !adminPassword)
      return res.status(400).json({ message: 'Name, email and password are required' });

    // Block super admin email from being used as a restaurant admin
    if (adminEmail.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ message: 'This email cannot be used for restaurant registration.' });
    }

    const exists = await Restaurant.findOne({ adminEmail });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(adminPassword, 12);
    const restaurant = await Restaurant.create({
      name, adminEmail, adminPassword: hash, description, address, phone,
      tables: ['Table1', 'Table2', 'Table3', 'Table4', 'Takeaway'],
    });

    const token = jwt.sign({ id: restaurant._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { adminPassword: _, ...data } = restaurant.toObject();
    res.status(201).json({ token, restaurant: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { adminEmail, adminPassword } = req.body;

    // Redirect super admin to correct panel
    if (adminEmail?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: 'Please use the Super Admin panel to sign in.' });
    }

    const restaurant = await Restaurant.findOne({ adminEmail });
    if (!restaurant) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(adminPassword, restaurant.adminPassword);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: restaurant._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { adminPassword: _, ...data } = restaurant.toObject();
    res.json({ token, restaurant: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current restaurant
router.get('/me', auth, (req, res) => {
  res.json({ restaurant: req.restaurant });
});

// Update restaurant profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, description, address, phone, currency } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurant._id,
      { name, description, address, phone, currency },
      { new: true }
    ).select('-adminPassword');
    res.json({ restaurant });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { adminEmail } = req.body;
    const restaurant = await Restaurant.findOne({ adminEmail });
    if (!restaurant) {
      return res.status(404).json({ message: 'There is no user with that email' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    restaurant.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    restaurant.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await restaurant.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please go to the following link to reset your password: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        to: restaurant.adminEmail,
        subject: 'Password reset token',
        text: message
      });
      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      restaurant.resetPasswordToken = undefined;
      restaurant.resetPasswordExpire = undefined;
      await restaurant.save();
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const restaurant = await Restaurant.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!restaurant) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    restaurant.adminPassword = await bcrypt.hash(req.body.password, 12);
    restaurant.resetPasswordToken = undefined;
    restaurant.resetPasswordExpire = undefined;
    await restaurant.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
