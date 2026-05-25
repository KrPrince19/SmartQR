'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { apiAuth, formatTableLabel, formatCurrency, formatDate, STATUS_COLORS, STATUS_LABELS } from '../../../lib/api';
import { Search, Filter, Printer, Loader2, ChevronDown, X, RefreshCw } from 'lucide-react';

export default function OrdersPage() {
  const { token, restaurant, clearUnread } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [todayOnly, setTodayOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [printOrder, setPrintOrder] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const client = apiAuth(token);

  // Clear unread badge when viewing orders
  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  const fetchOrders = async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30', page: pg });
      if (filter !== 'all') params.set('status', filter);
      if (todayOnly) params.set('today', 'true');
      const { data } = await client.get(`/orders?${params}`);
      setOrders(pg === 1 ? data.orders : (prev) => [...prev, ...data.orders]);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { setPage(1); fetchOrders(1); }, [filter, todayOnly]);

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      String(o.orderNumber).includes(s) ||
      o.tableNumber?.toLowerCase().includes(s) ||
      o.items.some((i) => i.name.toLowerCase().includes(s))
    );
  });

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'placed', label: 'Placed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'served', label: 'Served' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} {todayOnly ? "today's" : 'total'} orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Today / All toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setTodayOnly(true)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                todayOnly ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTodayOnly(false)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                !todayOnly ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              All Time
            </button>
          </div>
          <button onClick={() => fetchOrders(1)} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">No orders found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Table</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800">#{order.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{formatTableLabel(order.tableNumber)}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">
                        {order.items.slice(0, 2).map((i, idx) => (
                          <span key={idx} className="mr-2">{i.name} ×{i.quantity}</span>
                        ))}
                        {order.items.length > 2 && (
                          <span className="text-gray-400">+{order.items.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {formatCurrency(order.totalAmount, restaurant.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPrintOrder(order)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <div key={order._id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-bold text-gray-900">#{order.orderNumber}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-700">{formatTableLabel(order.tableNumber)}</span>
                  </div>
                  <span className={`badge ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {order.items.map((i, idx) => `${i.name} ×${i.quantity}`).join(', ')}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 text-xs">{formatDate(order.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{formatCurrency(order.totalAmount, restaurant.currency)}</span>
                    <button onClick={() => setPrintOrder(order)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <Printer className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {filteredOrders.length < total && (
            <div className="text-center mt-4">
              <button
                onClick={() => { const next = page + 1; setPage(next); fetchOrders(next); }}
                className="btn-secondary text-sm"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* Print Modal */}
      {printOrder && (
        <PrintModal
          order={printOrder}
          restaurant={restaurant}
          onClose={() => setPrintOrder(null)}
          onUpdate={() => fetchOrders(page)}
        />
      )}
    </div>
  );
}

function PrintModal({ order: initialOrder, restaurant, onClose, onUpdate }) {
  const { token } = useAuthStore();
  const [order, setOrder] = useState(initialOrder);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: 'Water Bottle', price: 20, quantity: 1 });
  const [adding, setAdding] = useState(false);

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
      <div className="bg-white rounded-2xl max-w-sm w-full flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Bill — Order #{order.orderNumber}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 font-mono text-sm relative overflow-hidden z-0 bg-white">
          {/* Watermark Background */}
          <div className="absolute inset-0 z-[-1] flex items-center justify-center pointer-events-none opacity-[0.03] select-none overflow-hidden">
            <span className="text-5xl font-black whitespace-nowrap -rotate-45 text-black">
              {restaurant.name}
            </span>
          </div>

          <div className="text-center mb-4 relative z-10">
            <p className="font-bold text-xl tracking-tight text-black">{restaurant.name}</p>
            {restaurant.address && <p className="text-xs text-gray-500 mt-1">{restaurant.address}</p>}
          </div>
          <div className="space-y-1 mb-4 text-xs">
            <div className="flex justify-between"><span>Order #</span><span>{order.orderNumber}</span></div>
            <div className="flex justify-between"><span>Table</span><span>{formatTableLabel(order.tableNumber)}</span></div>
            <div className="flex justify-between"><span>Date</span><span>{new Date(order.createdAt).toLocaleDateString('en-IN')}</span></div>
          </div>
          <div className="border-t border-dashed pt-3 mb-3 space-y-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span>{item.name} ×{item.quantity}</span>
                <span>{restaurant.currency}{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-dashed pt-2 flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{restaurant.currency}{order.totalAmount.toFixed(2)}</span>
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

        <div className="p-4 flex gap-3 border-t no-print flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
          <button onClick={() => window.print()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
