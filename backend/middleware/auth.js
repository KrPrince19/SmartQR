const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, access denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const restaurant = await Restaurant.findById(decoded.id).select('-adminPassword');
    if (!restaurant) return res.status(401).json({ message: 'Invalid token' });

    req.restaurant = restaurant;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid' });
  }
};

module.exports = auth;
