'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, apiAuth, formatTableLabel, formatDate } from '../../lib/api';
import io from 'socket.io-client';
import { ChefHat, Bell, Clock, Loader2, QrCode, RefreshCw } from 'lucide-react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const COLS = [
  { key: 'placed', label: 'New Orders', color: 'blue', icon: Clock, action: 'Start Prep', next: 'preparing' },
  { key: 'preparing', label: 'Preparing', color: 'amber', icon: ChefHat, action: 'Mark Ready', next: 'ready' },
  { key: 'ready', label: 'Ready', color: 'green', icon: Bell, action: 'Mark Served', next: 'served' },
];

function KitchenContent() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('rid');
  const token = searchParams.get('token');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [time, setTime] = useState(new Date());
  const socketRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [440, 550, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    } catch {}
  };

  const fetchOrders = async () => {
    if (!restaurantId || !token) return;
    try {
      const client = apiAuth(token);
      const { data } = await client.get('/orders?status=placed');
      const { data: prep } = await client.get('/orders?status=preparing');
      const { data: ready } = await client.get('/orders?status=ready');
      setOrders([...data.orders, ...prep.orders, ...ready.orders]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    if (!restaurantId) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join-restaurant', restaurantId);

    socket.on('new-order', (order) => {
      setOrders((prev) => [order, ...prev]);
      playSound();
    });

    socket.on('order-status-changed', ({ orderId, status }) => {
      if (['served', 'cancelled'].includes(status)) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
      }
    });

    return () => {
      socket.emit('leave-restaurant', restaurantId);
      socket.disconnect();
    };
  }, [restaurantId, token]);

  const updateStatus = async (orderId, status) => {
    if (!token) return;
    setUpdating((prev) => ({ ...prev, [orderId]: true }));
    try {
      const client = apiAuth(token);
      await client.patch(`/orders/${orderId}/status`, { status });
      if (['served', 'cancelled'].includes(status)) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
      }
    } catch {}
    setUpdating((prev) => ({ ...prev, [orderId]: false }));
  };

  const getElapsed = (createdAt) => {
    const diff = Math.floor((new Date() - new Date(createdAt)) / 60000);
    return diff < 1 ? 'Just now' : `${diff}m ago`;
  };

  if (!restaurantId || !token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-semibold mb-2">Kitchen Display Setup</h2>
          <p className="text-gray-400 text-sm">Access this page from your admin dashboard via the Kitchen Display link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Kitchen Display</h1>
            <p className="text-gray-400 text-xs">Real-time order queue</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-xs text-gray-400">{time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
          </div>
          <button onClick={fetchOrders} className="p-2 hover:bg-gray-700 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Columns */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 p-4 h-[calc(100vh-73px)]">
          {COLS.map(({ key, label, color, icon: Icon, action, next }) => {
            const colOrders = orders.filter((o) => o.status === key);
            return (
              <div key={key} className={`flex flex-col bg-gray-800 rounded-2xl overflow-hidden border border-gray-700`}>
                {/* Column header */}
                <div className={`px-4 py-3 flex items-center justify-between border-b border-gray-700 ${
                  color === 'blue' ? 'bg-blue-900/30' :
                  color === 'amber' ? 'bg-amber-900/30' : 'bg-green-900/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${
                      color === 'blue' ? 'text-blue-400' :
                      color === 'amber' ? 'text-amber-400' : 'text-green-400'
                    }`} />
                    <span className="font-semibold text-sm">{label}</span>
                  </div>
                  <span className={`badge text-xs ${
                    color === 'blue' ? 'bg-blue-800 text-blue-200' :
                    color === 'amber' ? 'bg-amber-800 text-amber-200' : 'bg-green-800 text-green-200'
                  }`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Orders */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-600">
                      <Icon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No orders</p>
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <div
                        key={order._id}
                        className={`bg-gray-700 rounded-xl overflow-hidden border ${
                          color === 'blue' ? 'border-blue-700/50' :
                          color === 'amber' ? 'border-amber-700/50' : 'border-green-700/50'
                        } animate-fade-in`}
                      >
                        {/* Order header */}
                        <div className={`px-3 py-2 flex items-center justify-between ${
                          color === 'blue' ? 'bg-blue-900/40' :
                          color === 'amber' ? 'bg-amber-900/40' : 'bg-green-900/40'
                        }`}>
                          <span className="font-bold text-sm">
                            #{order.orderNumber || '—'} · {formatTableLabel(order.tableNumber)}
                          </span>
                          <span className="text-xs text-gray-400">{getElapsed(order.createdAt)}</span>
                        </div>

                        {/* Items */}
                        <div className="px-3 py-2 space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                                <span className="text-gray-200">{item.name}</span>
                              </div>
                              <span className="text-gray-400 font-semibold">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Note */}
                        {order.customerNote && (
                          <div className="px-3 pb-2">
                            <p className="text-xs text-yellow-400 italic">📝 {order.customerNote}</p>
                          </div>
                        )}

                        {/* Action button */}
                        <div className="px-3 pb-3">
                          <button
                            onClick={() => updateStatus(order._id, next)}
                            disabled={updating[order._id]}
                            className={`w-full py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                              color === 'blue' ? 'bg-blue-600 hover:bg-blue-500 text-white' :
                              color === 'amber' ? 'bg-amber-600 hover:bg-amber-500 text-white' :
                              'bg-green-600 hover:bg-green-500 text-white'
                            }`}
                          >
                            {updating[order._id] ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            {action}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function KitchenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">Loading Kitchen Display...</h2>
        </div>
      </div>
    }>
      <KitchenContent />
    </Suspense>
  );
}
