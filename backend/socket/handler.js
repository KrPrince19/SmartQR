const socketHandler = (io) => {
  // Server-side cooldown tracker: orderId → last alert timestamp
  const alertCooldowns = new Map();
  const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

  io.on('connection', (socket) => {
    // Join restaurant room (admin/kitchen)
    socket.on('join-restaurant', (restaurantId) => {
      socket.join(`restaurant-${restaurantId}`);
    });

    // Join order room (customer tracking)
    socket.on('join-order', (orderId) => {
      socket.join(`order-${orderId}`);
    });

    socket.on('leave-restaurant', (restaurantId) => {
      socket.leave(`restaurant-${restaurantId}`);
    });

    socket.on('leave-order', (orderId) => {
      socket.leave(`order-${orderId}`);
    });

    // Customer alert: notify admin that an order is taking too long
    // Payload: { orderId, restaurantId, tableNumber, orderNumber }
    socket.on('customer-alert', ({ orderId, restaurantId, tableNumber, orderNumber }) => {
      if (!orderId || !restaurantId) return;

      const now = Date.now();
      const last = alertCooldowns.get(orderId) || 0;

      // Server enforces 10-minute cooldown per order
      if (now - last < COOLDOWN_MS) {
        socket.emit('alert-cooldown', { retryAfterMs: COOLDOWN_MS - (now - last) });
        return;
      }

      alertCooldowns.set(orderId, now);

      // Broadcast to all admin sockets in the restaurant room
      io.to(`restaurant-${restaurantId}`).emit('customer-alert', {
        orderId,
        tableNumber,
        orderNumber,
        sentAt: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {});
  });
};

module.exports = socketHandler;
