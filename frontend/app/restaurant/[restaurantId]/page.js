'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { api, formatTableLabel, formatCurrency } from '../../../lib/api';
import {
  ShoppingCart, Plus, Minus, Leaf, ChevronRight, Search, X,
  AlertCircle, Loader2, CheckCircle, Trash2, StickyNote,
  Droplet, Bell, Receipt, MessageSquarePlus
} from 'lucide-react';

function CustomerMenuContent() {
  const { restaurantId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableNumber = searchParams.get('table') || '';

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showCart, setShowCart] = useState(false);
  const [note, setNote] = useState('');
  
  // Service Request states
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const [serviceStatus, setServiceStatus] = useState('');

  const requestService = async (type) => {
    try {
      await api.post('/service-requests', { restaurantId, tableNumber, requestType: type });
      setServiceStatus('Request sent!');
      setTimeout(() => setServiceStatus(''), 3000);
      setShowServiceMenu(false);
    } catch (err) {
      setServiceStatus('Failed to send request');
      setTimeout(() => setServiceStatus(''), 3000);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [restRes, menuRes] = await Promise.all([
          api.get(`/auth/restaurant/${restaurantId}`).catch(() =>
            api.get(`/orders/restaurant-info/${restaurantId}`).catch(() => ({ data: null }))
          ),
          api.get(`/menu/restaurant/${restaurantId}`),
        ]);
        // Get restaurant info from a public order or fallback
        setMenuItems(menuRes.data.items || []);
        setLoading(false);
      } catch (err) {
        // Try to get restaurant name from menu items
        try {
          const menuRes = await api.get(`/menu/restaurant/${restaurantId}`);
          setMenuItems(menuRes.data.items || []);
        } catch {
          setError('Menu not found');
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [restaurantId]);

  const categories = ['All', ...new Set(menuItems.map((i) => i.category))];

  const filtered = menuItems.filter((item) => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = filtered.reduce((acc, item) => {
    const cat = activeCategory === 'All' ? item.category : item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const cartItems = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ ...menuItems.find((m) => m._id === id), qty }))
    .filter(Boolean);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  const setQty = (id, delta) => {
    setCart((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const placeOrder = async () => {
    if (!cartItems.length) return;
    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        restaurantId,
        tableNumber,
        items: cartItems.map((i) => ({
          menuItem: i._id,
          name: i.name,
          price: i.price,
          quantity: i.qty,
          isVeg: i.isVeg,
        })),
        customerNote: note,
      });
      router.push(`/order/${data.order._id}`);
    } catch (err) {
      setError('Failed to place order. Please try again.');
      setPlacing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Loading menu...</p>
      </div>
    </div>
  );

  if (error && !menuItems.length) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="text-center card p-8 max-w-sm mx-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-2">Menu Unavailable</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Menu</h1>
              {tableNumber && (
                <p className="text-xs text-brand-600 font-medium">
                  📍 {formatTableLabel(tableNumber)}
                </p>
              )}
            </div>
            {cartCount > 0 && (
              <button
                onClick={() => setShowCart(true)}
                className="relative bg-brand-500 text-white rounded-2xl px-4 py-2 flex items-center gap-2 text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{cartCount} item{cartCount > 1 ? 's' : ''}</span>
                <span className="font-semibold">· ₹{cartTotal.toFixed(0)}</span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 text-sm bg-gray-50"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-32">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-6">
            {activeCategory === 'All' && (
              <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                {category}
              </h2>
            )}
            <div className="space-y-3">
              {items.map((item) => (
                <MenuItemCard
                  key={item._id}
                  item={item}
                  qty={cart[item._id] || 0}
                  onAdd={() => setQty(item._id, 1)}
                  onRemove={() => setQty(item._id, -1)}
                />
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No items found</p>
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative bg-white w-full max-w-2xl mx-auto rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Your Order</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {cartItems.map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                        <span className={`block w-1.5 h-1.5 rounded-full m-auto mt-0.5 ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                      </span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <p className="text-brand-600 text-sm font-medium mt-0.5">₹{item.price} × {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(item._id, -1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-semibold text-sm">{item.qty}</span>
                    <button onClick={() => setQty(item._id, 1)} className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
                <StickyNote className="w-3 h-3" /> Special instructions (optional)
              </label>
              <textarea
                className="input text-sm resize-none"
                rows={2}
                placeholder="e.g. Less spicy, no onions..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Total + Place */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-gray-700">Total</span>
                <span className="text-xl font-bold text-gray-900">₹{cartTotal.toFixed(2)}</span>
              </div>
              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
              <button
                onClick={placeOrder}
                disabled={placing}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
              >
                {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {placing ? 'Placing Order...' : 'Confirm & Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating cart button (when cart has items and drawer closed) */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4 pointer-events-none">
          <button
            onClick={() => setShowCart(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white rounded-2xl px-6 py-3.5 flex items-center gap-3 shadow-lg shadow-brand-500/30 transition-all active:scale-95 pointer-events-auto"
          >
            <div className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">{cartCount}</div>
            <span className="font-medium">View Order</span>
            <span className="font-bold">₹{cartTotal.toFixed(0)}</span>
          </button>
        </div>
      )}

      {/* Service Request FAB */}
      {tableNumber && !showCart && (
        <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3">
          {showServiceMenu && (
            <div className="flex flex-col gap-2 mb-2 animate-slide-in origin-bottom-right">
              <button onClick={() => requestService('request_bill')} className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all group">
                <span className="text-sm font-semibold text-gray-700 group-hover:text-red-600">Request Bill</span>
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Receipt className="w-4 h-4" />
                </div>
              </button>
              <button onClick={() => requestService('call_waiter')} className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all group">
                <span className="text-sm font-semibold text-gray-700 group-hover:text-yellow-600">Call Waiter</span>
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                  <Bell className="w-4 h-4" />
                </div>
              </button>
              <button onClick={() => requestService('need_water')} className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all group">
                <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600">Need Water</span>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Droplet className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowServiceMenu(!showServiceMenu)}
            className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 ${
              showServiceMenu ? 'bg-gray-900 text-white rotate-45' : 'bg-white text-brand-600 border border-gray-100'
            }`}
          >
            {showServiceMenu ? <Plus className="w-6 h-6" /> : <MessageSquarePlus className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* Service Request Toast */}
      {serviceStatus && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl animate-fade-in">
          {serviceStatus}
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading menu...</p>
        </div>
      </div>
    }>
      <CustomerMenuContent />
    </Suspense>
  );
}

function MenuItemCard({ item, qty, onAdd, onRemove }) {
  return (
    <div className="card p-4 flex gap-4 animate-fade-in">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <span className={`mt-0.5 w-4 h-4 rounded-sm border-2 flex-shrink-0 flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
          </span>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{item.name}</h3>
        </div>
        {item.description && (
          <p className="text-gray-500 text-xs mb-2 line-clamp-2 ml-6">{item.description}</p>
        )}
        <p className="font-bold text-gray-900 ml-6">₹{item.price}</p>
      </div>

      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {item.image && (
          <img
            src={item.image}
            alt={item.name}
            className="w-20 h-16 object-cover rounded-xl"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}
        {qty === 0 ? (
          <button
            onClick={onAdd}
            className="px-5 py-1.5 bg-brand-50 text-brand-600 border border-brand-200 rounded-xl text-sm font-semibold hover:bg-brand-100 transition-colors"
          >
            ADD
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-brand-500 rounded-xl px-2 py-1">
            <button onClick={onRemove} className="text-white p-0.5">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-white font-bold text-sm w-4 text-center">{qty}</span>
            <button onClick={onAdd} className="text-white p-0.5">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
