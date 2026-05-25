const router = require('express').Router();
const Restaurant = require('../models/Restaurant');

// Public: get restaurant basic info by ID
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('name description address phone currency');
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json({ restaurant });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
