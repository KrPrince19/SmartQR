const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    enum: ['trial', 'basic', 'pro', 'enterprise'],
    default: 'trial',
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'cancelled'],
    default: 'active',
  },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  trialEndsAt: { type: Date },
  autoRenew: { type: Boolean, default: false },
  // Billing
  amount: { type: Number, default: 0 }, // Monthly amount in INR
  currency: { type: String, default: 'INR' },
  // Notes from super admin
  notes: { type: String, default: '' },
  // History
  history: [{
    action: { type: String }, // 'created', 'renewed', 'suspended', 'plan_changed'
    plan: { type: String },
    date: { type: Date, default: Date.now },
    by: { type: String, default: 'superadmin' },
    note: { type: String },
  }],
}, { timestamps: true });

// Virtual: days left
subscriptionSchema.virtual('daysLeft').get(function () {
  const diff = this.endDate - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual: isExpiringSoon (within 7 days)
subscriptionSchema.virtual('isExpiringSoon').get(function () {
  return this.status === 'active' && this.daysLeft <= 7;
});

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
