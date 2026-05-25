const router = require('express').Router();
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// Public: place order
router.post('/', async (req, res) => {
  try {
    const { restaurantId, tableNumber, items, customerNote } = req.body;
    if (!restaurantId || !tableNumber || !items?.length)
      return res.status(400).json({ message: 'Restaurant, table, and items are required' });

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const order = await Order.create({
      restaurant: restaurantId,
      tableNumber,
      items,
      totalAmount,
      customerNote: customerNote || '',
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant-${restaurantId}`).emit('new-order', order);
    }

    res.status(201).json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: get single order (for tracking)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('restaurant', 'name currency');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get all orders for restaurant
router.get('/', auth, async (req, res) => {
  try {
    const { status, limit = 50, page = 1, today } = req.query;
    const filter = { restaurant: req.restaurant._id };
    if (status) filter.status = status;

    // today=true → only orders placed today (midnight to now)
    if (today === 'true') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: startOfDay };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(filter);
    res.json({ orders, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update order status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const order = await Order.findOne({ _id: req.params.id, restaurant: req.restaurant._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();

    const io = req.app.get('io');
    if (io) {
      // Notify customer tracking page
      io.to(`order-${order._id}`).emit('order-updated', { status, orderId: order._id });
      // Notify kitchen/admin dashboards
      io.to(`restaurant-${req.restaurant._id}`).emit('order-status-changed', {
        orderId: order._id,
        status,
        tableNumber: order.tableNumber,
      });
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: add item to existing order (e.g., water bottle)
router.post('/:id/add-item', auth, async (req, res) => {
  try {
    const { name, price, quantity, isVeg = true } = req.body;
    if (!name || price == null || !quantity) {
      return res.status(400).json({ message: 'Name, price, and quantity are required' });
    }

    const order = await Order.findOne({ _id: req.params.id, restaurant: req.restaurant._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Append the new item
    order.items.push({ name, price: Number(price), quantity: Number(quantity), isVeg });
    
    // Recalculate total amount
    order.totalAmount = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    
    await order.save();

    // Notify customer tracking page to refresh
    const io = req.app.get('io');
    if (io) {
      io.to(`order-${order._id}`).emit('order-updated', { status: order.status, orderId: order._id });
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get 7-day sales chart data
router.get('/stats/weekly', auth, async (req, res) => {
  try {
    const days = [];
    const now = new Date();

    // Build array of the last 7 days (oldest → newest)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      days.push({ start: d, end, label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }) });
    }

    const results = await Promise.all(
      days.map(({ start, end }) =>
        Order.aggregate([
          {
            $match: {
              restaurant: req.restaurant._id,
              status: 'served',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: '$totalAmount' },
              orders: { $sum: 1 },
            },
          },
        ])
      )
    );

    const weekly = days.map((d, i) => ({
      label: d.label,
      date: d.start,
      revenue: results[i][0]?.revenue || 0,
      orders: results[i][0]?.orders || 0,
    }));

    res.json({ weekly });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get sales stats
router.get('/stats/sales', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, allServed] = await Promise.all([
      Order.find({ restaurant: req.restaurant._id, status: 'served', createdAt: { $gte: today } }),
      Order.find({ restaurant: req.restaurant._id, status: 'served' }),
    ]);

    const todaySales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalSales = allServed.reduce((sum, o) => sum + o.totalAmount, 0);
    const todayCount = todayOrders.length;
    const totalCount = allServed.length;

    // Active orders count
    const activeCount = await Order.countDocuments({
      restaurant: req.restaurant._id,
      status: { $in: ['placed', 'preparing', 'ready'] },
    });

    res.json({ todaySales, totalSales, todayCount, totalCount, activeCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
