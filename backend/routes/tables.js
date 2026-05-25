const router = require('express').Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');
const QRCode = require('qrcode');

// Get tables
router.get('/', auth, async (req, res) => {
  try {
    res.json({ tables: req.restaurant.tables });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update tables list
router.put('/', auth, async (req, res) => {
  try {
    const { tables } = req.body;
    if (!Array.isArray(tables)) return res.status(400).json({ message: 'Tables must be an array' });

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurant._id,
      { tables },
      { new: true }
    ).select('-adminPassword');

    res.json({ tables: restaurant.tables });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate QR code for a table
router.get('/qr/:table', auth, async (req, res) => {
  try {
    const { table } = req.params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${frontendUrl}/restaurant/${req.restaurant._id}?table=${encodeURIComponent(table)}`;

    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    res.json({ qr: qrDataUrl, url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
