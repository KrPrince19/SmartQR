const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const auth = require('../middleware/auth'); // assuming admin auth

// POST /api/service-requests (Public - for customers)
router.post('/', async (req, res) => {
  try {
    const { restaurantId, tableNumber, requestType } = req.body;

    if (!restaurantId || !tableNumber || !requestType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const validTypes = ['need_water', 'call_waiter', 'request_bill'];
    if (!validTypes.includes(requestType)) {
      return res.status(400).json({ message: 'Invalid request type' });
    }

    const serviceRequest = await ServiceRequest.create({
      restaurant: restaurantId,
      tableNumber,
      requestType
    });

    // Emit socket event to restaurant room
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant-${restaurantId}`).emit('new-service-request', serviceRequest);
    }

    res.status(201).json(serviceRequest);
  } catch (err) {
    console.error('Service request creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/service-requests (Protected - for restaurant admins/staff)
router.get('/', auth, async (req, res) => {
  try {
    const requests = await ServiceRequest.find({
      restaurant: req.restaurant.id,
      status: { $in: ['pending', 'in_progress'] } // only fetch active requests
    }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error('Service request fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/service-requests/:id (Protected - for staff to update status)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      { _id: req.params.id, restaurant: req.restaurant.id },
      updateData,
      { new: true }
    );

    if (!serviceRequest) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Emit update event to the restaurant room
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant-${req.restaurant.id}`).emit('update-service-request', serviceRequest);
    }

    res.json(serviceRequest);
  } catch (err) {
    console.error('Service request update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
