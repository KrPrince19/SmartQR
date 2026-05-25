const router = require('express').Router();
const bcrypt = require('bcryptjs');
const superAuth = require('../middleware/superAuth');
const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Feedback = require('../models/Feedback');

// All routes require super admin auth
router.use(superAuth);

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalRestaurants,
      activeRestaurants,
      suspendedRestaurants,
      totalOrders,
      activeSubscriptions,
      expiredSubscriptions,
      expiringSoon,
      trialSubscriptions,
      newThisMonth,
      revenueData,
    ] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isActive: true }),
      Restaurant.countDocuments({ isActive: false }),
      Order.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'active', endDate: { $lte: sevenDays, $gte: now } }),
      Subscription.countDocuments({ plan: 'trial', status: 'active' }),
      Restaurant.countDocuments({ createdAt: { $gte: thirtyDays } }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$plan', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const monthlyRevenue = revenueData.reduce((sum, r) => sum + r.total, 0);

    res.json({
      totalRestaurants,
      activeRestaurants,
      suspendedRestaurants,
      totalOrders,
      activeSubscriptions,
      expiredSubscriptions,
      expiringSoon,
      trialSubscriptions,
      newThisMonth,
      monthlyRevenue,
      revenueByPlan: revenueData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── RESTAURANTS LIST ────────────────────────────────────────────────────────
router.get('/restaurants', async (req, res) => {
  try {
    const { search, status, plan, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'suspended') filter.isActive = false;

    let restaurants = await Restaurant.find(filter)
      .select('-adminPassword')
      .sort({ createdAt: -1 })
      .lean();

    // Get all subscriptions for these restaurants
    const restaurantIds = restaurants.map((r) => r._id);
    const subscriptions = await Subscription.find({ restaurant: { $in: restaurantIds } }).lean();
    const subMap = {};
    subscriptions.forEach((s) => { subMap[String(s.restaurant)] = s; });

    // Merge subscription data
    let merged = restaurants.map((r) => ({
      ...r,
      subscription: subMap[String(r._id)] || null,
    }));

    // Filter by plan
    if (plan && plan !== 'all') {
      merged = merged.filter((r) => r.subscription?.plan === plan);
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      merged = merged.filter((r) =>
        r.name.toLowerCase().includes(s) ||
        r.adminEmail.toLowerCase().includes(s) ||
        r.address?.toLowerCase().includes(s)
      );
    }

    const total = merged.length;
    const paginated = merged.slice((page - 1) * limit, page * limit);

    res.json({ restaurants: paginated, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── SINGLE RESTAURANT ───────────────────────────────────────────────────────
router.get('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('-adminPassword').lean();
    if (!restaurant) return res.status(404).json({ message: 'Not found' });

    const [subscription, orderCount, menuCount, recentOrders, orderStats] = await Promise.all([
      Subscription.findOne({ restaurant: req.params.id }),
      Order.countDocuments({ restaurant: req.params.id }),
      MenuItem.countDocuments({ restaurant: req.params.id }),
      Order.find({ restaurant: req.params.id }).sort({ createdAt: -1 }).limit(5),
      Order.aggregate([
        { $match: { restaurant: restaurant._id, status: 'served' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalOrders: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      restaurant,
      subscription,
      stats: {
        orderCount,
        menuCount,
        totalRevenue: orderStats[0]?.totalRevenue || 0,
        servedOrders: orderStats[0]?.totalOrders || 0,
      },
      recentOrders,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── SUSPEND / ACTIVATE RESTAURANT ─────────────────────────────────────────
router.patch('/restaurants/:id/toggle-status', async (req, res) => {
  try {
    const { reason } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Not found' });

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    // Log to subscription history
    await Subscription.findOneAndUpdate(
      { restaurant: req.params.id },
      {
        $push: {
          history: {
            action: restaurant.isActive ? 'activated' : 'suspended',
            date: new Date(),
            by: req.superAdmin.email,
            note: reason || '',
          },
        },
      }
    );

    res.json({ isActive: restaurant.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── SUBSCRIPTIONS LIST ──────────────────────────────────────────────────────
router.get('/subscriptions', async (req, res) => {
  try {
    const { status, plan, expiring } = req.query;
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (plan && plan !== 'all') filter.plan = plan;
    if (expiring === 'true') {
      filter.status = 'active';
      filter.endDate = { $lte: sevenDays, $gte: now };
    }

    const subscriptions = await Subscription.find(filter)
      .populate('restaurant', 'name adminEmail address phone isActive')
      .sort({ endDate: 1 })
      .lean();

    res.json({ subscriptions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CREATE / UPDATE SUBSCRIPTION ───────────────────────────────────────────
router.post('/subscriptions', async (req, res) => {
  try {
    const { restaurantId, plan, endDate, amount, notes, autoRenew } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    let sub = await Subscription.findOne({ restaurant: restaurantId });
    const historyEntry = {
      action: sub ? 'renewed' : 'created',
      plan,
      date: new Date(),
      by: req.superAdmin.email,
      note: notes || '',
    };

    if (sub) {
      sub.plan = plan;
      sub.endDate = new Date(endDate);
      sub.amount = amount || 0;
      sub.notes = notes || '';
      sub.autoRenew = autoRenew || false;
      sub.status = 'active';
      sub.history.push(historyEntry);
      await sub.save();
    } else {
      sub = await Subscription.create({
        restaurant: restaurantId,
        plan,
        startDate: new Date(),
        endDate: new Date(endDate),
        amount: amount || 0,
        notes: notes || '',
        autoRenew: autoRenew || false,
        status: 'active',
        history: [historyEntry],
      });
    }

    res.status(sub ? 200 : 201).json({ subscription: sub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE SUBSCRIPTION STATUS ──────────────────────────────────────────────
router.patch('/subscriptions/:id', async (req, res) => {
  try {
    const { status, plan, endDate, amount, notes } = req.body;
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    const historyEntry = { action: 'updated', date: new Date(), by: req.superAdmin.email, note: notes || '' };
    if (status) { sub.status = status; historyEntry.action = status; }
    if (plan) { sub.plan = plan; historyEntry.action = 'plan_changed'; historyEntry.plan = plan; }
    if (endDate) sub.endDate = new Date(endDate);
    if (amount !== undefined) sub.amount = amount;
    if (notes !== undefined) sub.notes = notes;

    sub.history.push(historyEntry);
    await sub.save();

    res.json({ subscription: sub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ANALYTICS: revenue over time, plan distribution ─────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    // Monthly new restaurants (last 6 months)
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [monthlySignups, planDist, statusDist, topRestaurants] = await Promise.all([
      Restaurant.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$plan', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
      ]),
      Subscription.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: 'served' } },
        { $group: { _id: '$restaurant', orderCount: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { orderCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
        { $unwind: '$restaurant' },
        { $project: { name: '$restaurant.name', orderCount: 1, revenue: 1 } },
      ]),
    ]);

    res.json({ monthlySignups, planDist, statusDist, topRestaurants });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE RESTAURANT (hard delete, with confirmation) ──────────────────────
router.delete('/restaurants/:id', async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE') return res.status(400).json({ message: 'Type DELETE to confirm' });

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Not found' });

    await Promise.all([
      Restaurant.findByIdAndDelete(req.params.id),
      Subscription.findOneAndDelete({ restaurant: req.params.id }),
      MenuItem.deleteMany({ restaurant: req.params.id }),
      Order.deleteMany({ restaurant: req.params.id }),
    ]);

    res.json({ message: 'Restaurant and all data deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── FEEDBACK LIST ────────────────────────────────────────────────────────
router.get('/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json({ feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE FEEDBACK STATUS ───────────────────────────────────────────────────
router.patch('/feedback/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    if (status === 'reviewed' || status === 'resolved') {
      const restaurant = await Restaurant.findOne({ adminEmail: feedback.email });
      if (restaurant) {
        req.app.get('io').to(`restaurant-${restaurant._id}`).emit('feedback-status-updated', {
          status: status,
          message: `Your feedback has been marked as ${status} by the Super Admin.`
        });
      }
    }

    res.json({ feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
