const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  currency: { type: String, default: '₹' },
  tables: [{ type: String }],
  isActive: { type: Boolean, default: true },
  adminEmail: { type: String, required: true, unique: true },
  adminPassword: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
