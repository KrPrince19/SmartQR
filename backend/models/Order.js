const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  isVeg: { type: Boolean, default: true },
});

const orderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableNumber: { type: String, required: true },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['placed', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'placed',
  },
  totalAmount: { type: Number, required: true },
  customerNote: { type: String, default: '' },
  orderNumber: { type: Number },
  isBilled: { type: Boolean, default: false },
}, { timestamps: true });

orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments({ restaurant: this.restaurant });
    this.orderNumber = count + 1;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
