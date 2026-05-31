const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  tableNumber: {
    type: String,
    required: true
  },
  requestType: {
    type: String,
    enum: ['need_water', 'call_waiter', 'request_bill'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  completedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
