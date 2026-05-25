'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiAuth, formatTableLabel, formatCurrency, formatDate, STATUS_COLORS } from '../../lib/api';
import io from 'socket.io-client';
import {
  TrendingUp, ShoppingBag, Clock, CheckCircle2, IndianRupee,
  Loader2, RefreshCw, Printer, X, Bell, BarChart2, BellRing, AlertTriangle, MessageSquare
} from 'lucide-react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const { token, restaurant, incrementUnread } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [recentServed, setRecentServed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [printOrder, setPrintOrder] = useState(null);
  const [chartMode, setChartMode] = useState('revenue');
  const [customerAlerts, setCustomerAlerts] = useState([]); // { id, tableNumber, orderNumber, sentAt }
  const [feedbackAlerts, setFeedbackAlerts] = useState([]); // { status, message, key }
  const socketRef = useRef(null);

  const client = apiAuth(token);

  const fetchAll = async () => {
    try {
      const [statsRes, placedRes, prepRes, readyRes, servedRes, weeklyRes] = await Promise.all([
        client.get('/orders/stats/sales'),
        client.get('/orders?status=placed&limit=20&today=true'),
        client.get('/orders?status=preparing&limit=20&today=true'),
        client.get('/orders?status=ready&limit=20&today=true'),
        client.get('/orders?status=served&limit=10&today=true'),
        client.get('/orders/stats/weekly'),
      ]);
      setStats(statsRes.data);
      setWeeklyData(weeklyRes.data.weekly || []);
      setActiveOrders([
        ...readyRes.data.orders,
        ...prepRes.data.orders,
        ...placedRes.data.orders,
      ]);
      setRecentServed(servedRes.data.orders);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join-restaurant', restaurant._id);

    socket.on('new-order', (order) => {
      setActiveOrders((prev) => [order, ...prev]);
      setStats((prev) => prev ? { ...prev, activeCount: (prev.activeCount || 0) + 1 } : prev);
      incrementUnread();
      
      // Play alert chime
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784].forEach((f, i) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = f;
          g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
          o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
      } catch {}

      // Voice Announcement (Alexa-like)
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          const tableName = formatTableLabel(order.tableNumber);
          // Make item text more conversational: "2 Paneer Tikka" instead of "Paneer Tikka 2"
          const itemsText = order.items.map(item => `${item.quantity} ${item.name}`).join(', and ');
          const announcement = `New order from ${tableName}. ${itemsText}.`;
          
          const utterance = new SpeechSynthesisUtterance(announcement);
          
          // Try to find a good quality voice
          const voices = window.speechSynthesis.getVoices();
          let bestVoice = voices.find(v => v.name.includes('Google UK English Female')) ||
                          voices.find(v => v.name.includes('Google US English')) ||
                          voices.find(v => v.name.includes('Microsoft Zira')) || // Good Windows voice
                          voices.find(v => v.name.includes('Microsoft Neerja')) || // Indian English
                          voices.find(v => v.lang.startsWith('en-') && v.name.includes('Female')) ||
                          voices.find(v => v.lang.startsWith('en-'));
          
          if (bestVoice) {
            utterance.voice = bestVoice;
          }
          
          utterance.rate = 0.85; // Slightly slower for clarity
          utterance.pitch = 1.1; // Slightly higher pitch
          
          window.speechSynthesis.speak(utterance);
        }, 1000); // Wait 1 second after the chime
      }
    });

    socket.on('order-status-changed', ({ orderId, status }) => {
      if (status === 'served') {
        setActiveOrders((prev) => prev.filter((o) => o._id !== orderId));
        fetchAll(); // Refresh stats
      } else if (status === 'cancelled') {
        setActiveOrders((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        setActiveOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
      }
    });

    // Customer called for staff
    socket.on('customer-alert', ({ orderId, tableNumber, orderNumber, sentAt }) => {
      setCustomerAlerts((prev) => [
        { id: orderId, tableNumber, orderNumber, sentAt, key: Date.now() },
        ...prev,
      ]);
      // Play urgent alarm: rapid double-triple beep
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [880, 880, 1100, 880, 1100].forEach((f, i) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = f;
          g.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.12);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.1);
          o.start(ctx.currentTime + i * 0.12);
          o.stop(ctx.currentTime + i * 0.12 + 0.12);
        });
      } catch {}
    });

    socket.on('feedback-status-updated', ({ status, message }) => {
      setFeedbackAlerts((prev) => [
        { status, message, key: Date.now() },
        ...prev,
      ]);
      // Play a soft notification chime
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 600;
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.5);
      } catch {}
    });

    return () => { socket.emit('leave-restaurant', restaurant._id); socket.disconnect(); };
  }, []);

  const updateStatus = async (orderId, status) => {
    setUpdating((p) => ({ ...p, [orderId]: true }));
    try {
      await client.patch(`/orders/${orderId}/status`, { status });
      if (['served', 'cancelled'].includes(status)) {
        setActiveOrders((p) => p.filter((o) => o._id !== orderId));
        if (status === 'served') fetchAll();
      } else {
        setActiveOrders((p) => p.map((o) => o._id === orderId ? { ...o, status } : o));
      }
    } catch {}
    setUpdating((p) => ({ ...p, [orderId]: false }));
  };

  const nextStatus = { placed: 'preparing', preparing: 'ready', ready: 'served' };
  const nextLabel = { placed: 'Start Prep', preparing: 'Mark Ready', ready: 'Mark Served' };

  const statCards = stats ? [
    { label: "Today's Sales", value: formatCurrency(stats.todaySales, restaurant.currency), icon: IndianRupee, color: 'green', sub: `${stats.todayCount} orders` },
    { label: 'Active Orders', value: stats.activeCount, icon: Clock, color: 'amber', sub: 'In queue now' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalSales, restaurant.currency), icon: TrendingUp, color: 'blue', sub: `${stats.totalCount} served` },
    { label: 'Orders Today', value: stats.todayCount, icon: ShoppingBag, color: 'purple', sub: 'All statuses' },
  ] : [];

  const colorMap = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const iconBg = {
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={fetchAll} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Customer Alert Banners ── */}
      {customerAlerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {customerAlerts.map((alert) => (
            <div
              key={alert.key}
              className="flex items-center gap-3 bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-3 animate-pulse-once shadow-sm shadow-red-100"
            >
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BellRing className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-red-800 text-sm">
                  🚨 Customer needs attention — {formatTableLabel(alert.tableNumber)}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Order #{alert.orderNumber} · Called at {new Date(alert.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setCustomerAlerts((prev) => prev.filter((a) => a.key !== alert.key))}
                className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Feedback Alert Banners ── */}
      {feedbackAlerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {feedbackAlerts.map((alert) => (
            <div
              key={alert.key}
              className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 shadow-sm"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-blue-800 text-sm">Feedback Update</p>
                <p className="text-xs text-blue-600 mt-0.5">{alert.message}</p>
              </div>
              <button
                onClick={() => setFeedbackAlerts((prev) => prev.filter((a) => a.key !== alert.key))}
                className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className={`card p-4 border ${colorMap[color]}`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium opacity-80">{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg[color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs opacity-70 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* 7-Day Sales Chart */}
      {weeklyData.length > 0 && (
        <WeeklySalesChart
          data={weeklyData}
          currency={restaurant.currency}
          mode={chartMode}
          onModeChange={setChartMode}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Orders */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-500" />
              Active Orders
              {activeOrders.length > 0 && (
                <span className="badge bg-brand-100 text-brand-700">{activeOrders.length}</span>
              )}
            </h2>
          </div>

          {activeOrders.length === 0 ? (
            <div className="card p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active orders right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div key={order._id} className="card p-4 animate-fade-in">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">#{order.orderNumber || '—'}</span>
                        <span className="text-gray-400">·</span>
                        <span className="font-medium text-gray-700">{formatTableLabel(order.tableNumber)}</span>
                        <span className={`badge ${STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className="font-bold text-gray-900 text-sm flex-shrink-0">
                      {formatCurrency(order.totalAmount, restaurant.currency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-gray-600">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="truncate">{item.name}</span>
                        <span className="text-gray-400 ml-auto">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {order.customerNote && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mb-3 border border-amber-200">
                      📝 {order.customerNote}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    {nextStatus[order.status] && (
                      <button
                        onClick={() => updateStatus(order._id, nextStatus[order.status])}
                        disabled={updating[order._id]}
                        className="btn-primary text-xs py-1.5 flex items-center gap-1.5"
                      >
                        {updating[order._id] ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {nextLabel[order.status]}
                      </button>
                    )}
                    <button
                      onClick={() => setPrintOrder(order)}
                      className="btn-secondary text-xs py-1.5 flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" /> Bill
                    </button>
                    <button
                      onClick={() => updateStatus(order._id, 'cancelled')}
                      disabled={updating[order._id]}
                      className="ml-auto text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Served */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Recently Served
          </h2>
          {recentServed.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-gray-400 text-sm">No served orders yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentServed.map((order) => (
                <div key={order._id} className="card p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800">#{order.orderNumber}</span>
                      <span className="text-gray-400 text-xs">{formatTableLabel(order.tableNumber)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900">{formatCurrency(order.totalAmount, restaurant.currency)}</p>
                    <button onClick={() => setPrintOrder(order)} className="text-xs text-brand-600 hover:underline flex items-center gap-1 ml-auto">
                      <Printer className="w-3 h-3" /> Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Print Bill Modal */}
      {printOrder && (
        <PrintBillModal
          order={printOrder}
          restaurant={restaurant}
          onClose={() => setPrintOrder(null)}
          onUpdate={fetchAll}
        />
      )}
    </div>
  );
}

function PrintBillModal({ order: initialOrder, restaurant, onClose, onUpdate }) {
  const { token } = useAuthStore();
  const [order, setOrder] = useState(initialOrder);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: 'Water Bottle', price: 20, quantity: 1 });
  const [adding, setAdding] = useState(false);

  const handlePrint = () => window.print();

  const handleAddItem = async () => {
    setAdding(true);
    try {
      const client = apiAuth(token);
      const { data } = await client.post(`/orders/${order._id}/add-item`, newItem);
      setOrder(data.order);
      setShowAdd(false);
      setNewItem({ name: 'Water Bottle', price: 20, quantity: 1 });
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Failed to add item');
    }
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 no-print flex-shrink-0">
          <h3 className="font-semibold text-gray-800">Print Bill</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 print-bill relative overflow-hidden z-0 bg-white">
          {/* Watermark Background */}
          <div className="absolute inset-0 z-[-1] flex items-center justify-center pointer-events-none opacity-[0.03] select-none overflow-hidden">
            <span className="text-6xl font-black whitespace-nowrap -rotate-45 text-black">
              {restaurant.name}
            </span>
          </div>

          <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-4 relative z-10">
            <h2 className="font-bold text-2xl tracking-tight text-black">{restaurant.name}</h2>
            {restaurant.address && <p className="text-xs text-gray-500 mt-1">{restaurant.address}</p>}
            {restaurant.phone && <p className="text-xs text-gray-500">{restaurant.phone}</p>}
          </div>

          <div className="mb-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Order #</span>
              <span className="font-semibold">{order.orderNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Table</span>
              <span className="font-semibold">{formatTableLabel(order.tableNumber)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date</span>
              <span className="font-semibold text-xs">{formatDate(order.createdAt)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left pb-2">Item</th>
                  <th className="text-center pb-2">Qty</th>
                  <th className="text-right pb-2">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-1.5 text-gray-800">{item.name}</td>
                    <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-1.5 text-right font-medium">
                      {restaurant.currency}{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t-2 border-dashed border-gray-300 pt-3 flex justify-between font-bold text-lg">
            <span>TOTAL</span>
            <span>{restaurant.currency}{order.totalAmount.toFixed(2)}</span>
          </div>

          {order.customerNote && (
            <p className="text-xs text-gray-500 mt-3 italic">Note: {order.customerNote}</p>
          )}

          <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-300">
            <p className="text-xs text-gray-500">Thank you for dining with us!</p>
            <p className="text-xs text-gray-400 mt-1">Powered by SmartQR</p>
          </div>
        </div>

        {/* Add Item Form (No Print) */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 no-print flex-shrink-0">
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-brand-600 hover:bg-gray-100 transition-colors"
            >
              + Add Item to Bill
            </button>
          ) : (
            <div className="space-y-3 bg-white p-3 rounded-xl border border-gray-200">
              <input
                type="text"
                placeholder="Item Name (e.g. Water Bottle)"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="input-field text-sm py-1.5"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Price"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  className="input-field text-sm py-1.5 flex-1"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className="input-field text-sm py-1.5 w-20"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-1.5 text-xs">Cancel</button>
                <button onClick={handleAddItem} disabled={adding} className="btn-primary flex-1 py-1.5 text-xs">
                  {adding ? 'Adding...' : 'Save Item'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 no-print flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
          <button onClick={handlePrint} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> Print Bill
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pure SVG 7-Day Sales Chart ──────────────────────────────────────────────
function WeeklySalesChart({ data, currency, mode, onModeChange }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const W = 700, H = 200;
  const PAD = { top: 20, right: 20, bottom: 40, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => (mode === 'revenue' ? d.revenue : d.orders));
  const maxVal = Math.max(...values, 1);
  const minVal = 0;

  // Map data point to SVG coordinates
  const xOf = (i) => PAD.left + (i / (data.length - 1)) * chartW;
  const yOf = (v) => PAD.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  // Smooth bezier curve path
  const linePath = data.map((d, i) => {
    const x = xOf(i), y = yOf(values[i]);
    if (i === 0) return `M ${x} ${y}`;
    const px = xOf(i - 1), py = yOf(values[i - 1]);
    const cpx = (px + x) / 2;
    return `C ${cpx} ${py} ${cpx} ${y} ${x} ${y}`;
  }).join(' ');

  // Filled area path (close to bottom)
  const areaPath = linePath
    + ` L ${xOf(data.length - 1)} ${PAD.top + chartH}`
    + ` L ${xOf(0)} ${PAD.top + chartH} Z`;

  // Y-axis gridlines: 4 steps
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + chartH - t * chartH,
    val: Math.round(minVal + t * (maxVal - minVal)),
  }));

  const formatTick = (v) =>
    mode === 'revenue'
      ? v >= 1000 ? `${currency}${(v / 1000).toFixed(1)}k` : `${currency}${v}`
      : `${v}`;

  const todayIdx = data.length - 1;
  const totalVal = values.reduce((a, b) => a + b, 0);
  const avgVal = totalVal / data.length;

  return (
    <div className="card border border-gray-200 mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">7-Day Performance</h2>
            <p className="text-xs text-gray-400">Last 7 days of served orders</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary pills */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-sm font-bold text-gray-800">
                {mode === 'revenue' ? `${currency}${totalVal.toLocaleString('en-IN')}` : totalVal}
              </p>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-right">
              <p className="text-xs text-gray-400">Daily avg</p>
              <p className="text-sm font-bold text-gray-800">
                {mode === 'revenue' ? `${currency}${Math.round(avgVal).toLocaleString('en-IN')}` : Math.round(avgVal)}
              </p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => onModeChange('revenue')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                mode === 'revenue' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => onModeChange('orders')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                mode === 'orders' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Orders
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-2 pb-4 relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: '200px' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
            </linearGradient>
            {/* Hovered column gradient */}
            <linearGradient id="hoverGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Gridlines + Y axis labels */}
          {ticks.map(({ y, val }) => (
            <g key={val}>
              <line
                x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="#f1f5f9" strokeWidth="1"
              />
              <text
                x={PAD.left - 6} y={y + 4}
                textAnchor="end" fontSize="9" fill="#94a3b8"
              >
                {formatTick(val)}
              </text>
            </g>
          ))}

          {/* Hover column highlight */}
          {hoveredIdx !== null && (
            <rect
              x={xOf(hoveredIdx) - chartW / (data.length - 1) / 2}
              y={PAD.top}
              width={chartW / (data.length - 1)}
              height={chartH}
              fill="url(#hoverGrad)"
              rx="4"
            />
          )}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots + invisible hover targets */}
          {data.map((d, i) => {
            const x = xOf(i), y = yOf(values[i]);
            const isHov = hoveredIdx === i;
            const isToday = i === todayIdx;
            return (
              <g key={i}>
                {/* Invisible wide hit area */}
                <rect
                  x={i === 0 ? x - 20 : xOf(i - 1) + (x - xOf(i - 1)) / 2}
                  y={PAD.top}
                  width={chartW / (data.length - 1)}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  style={{ cursor: 'crosshair' }}
                />
                {/* Outer glow for hovered */}
                {isHov && (
                  <circle cx={x} cy={y} r="10" fill="#f97316" fillOpacity="0.12" />
                )}
                {/* Dot */}
                <circle
                  cx={x} cy={y}
                  r={isHov || isToday ? 5 : 3.5}
                  fill={isHov ? '#f97316' : isToday ? '#f97316' : '#fff'}
                  stroke="#f97316"
                  strokeWidth="2"
                  style={{ transition: 'r 0.15s' }}
                />
                {/* X-axis label */}
                <text
                  x={x} y={H - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isToday ? '#f97316' : '#94a3b8'}
                  fontWeight={isToday ? '700' : '400'}
                >
                  {d.label}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {hoveredIdx !== null && (() => {
            const i = hoveredIdx;
            const x = xOf(i), y = yOf(values[i]);
            const d = data[i];
            const boxW = 110, boxH = 54, pad = 8;
            const bx = Math.min(Math.max(x - boxW / 2, PAD.left), W - PAD.right - boxW);
            const by = y < PAD.top + boxH + 12 ? y + 14 : y - boxH - 14;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={bx} y={by} width={boxW} height={boxH}
                  rx="7" fill="white"
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.10))"
                  stroke="#fed7aa" strokeWidth="1"
                />
                <text x={bx + pad} y={by + 16} fontSize="9" fill="#94a3b8" fontWeight="600">
                  {d.label}
                </text>
                <text x={bx + pad} y={by + 31} fontSize="12" fill="#1e293b" fontWeight="700">
                  {currency}{d.revenue.toLocaleString('en-IN')}
                </text>
                <text x={bx + pad} y={by + 46} fontSize="9" fill="#64748b">
                  {d.orders} order{d.orders !== 1 ? 's' : ''}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
