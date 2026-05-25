const router = require('express').Router();
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');

// Public: get menu for a restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const items = await MenuItem.find({
      restaurant: req.params.restaurantId,
      isAvailable: true,
    }).sort({ category: 1, sortOrder: 1, name: 1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get all menu items (including unavailable)
router.get('/', auth, async (req, res) => {
  try {
    const items = await MenuItem.find({ restaurant: req.restaurant._id })
      .sort({ category: 1, sortOrder: 1, name: 1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: create menu item
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, price, category, image, isVeg, isAvailable, sortOrder } = req.body;
    if (!name || price === undefined || !category)
      return res.status(400).json({ message: 'Name, price, and category are required' });

    const item = await MenuItem.create({
      restaurant: req.restaurant._id,
      name, description, price, category, image, isVeg, isAvailable, sortOrder,
    });
    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update menu item
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, restaurant: req.restaurant._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ item: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: delete menu item
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, restaurant: req.restaurant._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
