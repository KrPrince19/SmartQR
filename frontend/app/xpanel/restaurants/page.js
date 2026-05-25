'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSuperStore } from '../../../store/useSuperStore';
import {
  Search, X, Store, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ChevronRight, ShoppingBag, UtensilsCrossed,
  IndianRupee, Calendar, Phone, Mail, MapPin, Trash2,
  ToggleLeft, ToggleRight, RefreshCw, Eye, CreditCard, Plus
} from 'lucide-react';

const PLAN_BADGE = {
  trial:      'bg-slate-700 text-slate-300 border-slate-600',
  basic:      'bg-blue-900/60 text-blue-300 border-blue-700/60',
  pro:        'bg-violet-900/60 text-violet-300 border-violet-700/60',
  enterprise: 'bg-amber-900/60 text-amber-300 border-amber-700/60',
};
const STATUS_BADGE = {
  active:    'bg-green-900/60 text-green-300 border-green-700/60',
  expired:   'bg-red-900/60 text-red-300 border-red-700/60',
  suspended: 'bg-slate-700 text-slate-400 border-slate-600',
  cancelled: 'bg-red-900/40 text-red-400 border-red-800/40',
};

const PLAN_PRICES = { trial: 0, basic: 999, pro: 2999, enterprise: 7999 };

export default function RestaurantsPage() {
  const { superClient } = useSuperStore();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null); // detail drawer
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [subModal, setSubModal] = useState(null); // subscription edit modal
  const [subForm, setSubForm] = useState({ plan: 'pro', endDate: '', amount: 2999, notes: '' });
  const [subSaving, setSubSaving] = useState(false);

  const client = superClient();

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (search) params.set('search', search);
      const { data } = await client.get(`/restaurants?${params}`);
      setRestaurants(data.restaurants);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [search, statusFilter, planFilter]);

  useEffect(() => { fetchRestaurants(); }, [statusFilter, planFilter]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(fetchRestaurants, 400);
    return () => clearTimeout(t);
  }, [search]);

  const openDetail = async (restaurant) => {
    setSelected(restaurant);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const { data } = await client.get(`/restaurants/${restaurant._id}`);
      setDetailData(data);
    } catch {}
    setDetailLoading(false);
  };

  const toggleStatus = async (id, currentlyActive) => {
    setToggling(id);
    try {
      const reason = currentlyActive ? 'Suspended by admin' : 'Reactivated by admin';
      const { data } = await client.patch(`/restaurants/${id}/toggle-status`, { reason });
      setRestaurants((prev) => prev.map((r) => r._id === id ? { ...r, isActive: data.isActive } : r));
      if (detailData?.restaurant?._id === id) {
        setDetailData((prev) => ({ ...prev, restaurant: { ...prev.restaurant, isActive: data.isActive } }));
      }
    } catch {}
    setToggling(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      await client.delete(`/restaurants/${selected._id}`, { data: { confirm: 'DELETE' } });
      setRestaurants((prev) => prev.filter((r) => r._id !== selected._id));
      setSelected(null);
    } catch {}
    setDeleting(false);
    setDeleteConfirm('');
  };

  const openSubModal = (restaurant) => {
    const sub = restaurant.subscription;
    const tomorrow = new Date();
    tomorrow.setMonth(tomorrow.getMonth() + 1);
    setSubForm({
      plan: sub?.plan || 'pro',
      endDate: sub?.endDate ? sub.endDate.slice(0, 10) : tomorrow.toISOString().slice(0, 10),
      amount: sub?.amount || PLAN_PRICES['pro'],
      notes: sub?.notes || '',
    });
    setSubModal(restaurant);
  };

  const saveSub = async () => {
    setSubSaving(true);
    try {
      await client.post('/subscriptions', {
        restaurantId: subModal._id,
        ...subForm,
        amount: Number(subForm.amount),
      });
      await fetchRestaurants();
      if (selected?._id === subModal._id) await openDetail(subModal);
      setSubModal(null);
    } catch {}
    setSubSaving(false);
  };

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'suspended', label: 'Suspended' },
  ];
  const PLAN_FILTERS = [
    { key: 'all', label: 'All Plans' },
    { key: 'trial', label: 'Trial' },
    { key: 'basic', label: 'Basic' },
    { key: 'pro', label: 'Pro' },
    { key: 'enterprise', label: 'Enterprise' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurants</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} total registered</p>
        </div>
        <button onClick={fetchRestaurants} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                statusFilter === key
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}>{label}</button>
          ))}
          <span className="w-px bg-slate-700 self-stretch mx-1" />
          {PLAN_FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setPlanFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                planFilter === key
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}>{label}</button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-500" /></button>}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>
      ) : restaurants.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Store className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No restaurants found</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800">
              <tr>
                {['Restaurant', 'Plan', 'Status', 'Expires', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {restaurants.map((r) => {
                const sub = r.subscription;
                const daysLeft = sub ? Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / 86400000)) : null;
                const expiringSoon = daysLeft !== null && daysLeft <= 7 && sub?.status === 'active';
                return (
                  <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-white">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.adminEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${PLAN_BADGE[sub.plan]}`}>
                          {sub.plan}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">No plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.isActive ? 'bg-green-400' : 'bg-red-500'}`} />
                        <span className="text-xs text-slate-300">{r.isActive ? 'Active' : 'Suspended'}</span>
                      </div>
                      {sub && (
                        <span className={`text-xs mt-0.5 block ${STATUS_BADGE[sub.status]?.split(' ')[1]}`}>
                          Sub: {sub.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <div>
                          <p className={`text-xs font-medium ${expiringSoon ? 'text-amber-400' : 'text-slate-300'}`}>
                            {expiringSoon && '⚠ '}{daysLeft}d left
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetail(r)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors" title="View details">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </button>
                        <button onClick={() => openSubModal(r)} className="p-1.5 hover:bg-violet-900/40 rounded-lg transition-colors" title="Manage subscription">
                          <CreditCard className="w-4 h-4 text-violet-400" />
                        </button>
                        <button onClick={() => toggleStatus(r._id, r.isActive)} disabled={toggling === r._id}
                          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors" title={r.isActive ? 'Suspend' : 'Activate'}>
                          {toggling === r._id ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> :
                            r.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h2 className="font-bold text-white">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-800 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
            ) : detailData && (
              <div className="p-5 space-y-5">
                {/* Status toggle */}
                <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Account Status</p>
                    <p className="text-xs text-slate-400">{detailData.restaurant.isActive ? 'Restaurant is active' : 'Restaurant is suspended'}</p>
                  </div>
                  <button onClick={() => toggleStatus(selected._id, detailData.restaurant.isActive)} disabled={toggling === selected._id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      detailData.restaurant.isActive
                        ? 'bg-red-900/50 text-red-300 hover:bg-red-900 border border-red-800/50'
                        : 'bg-green-900/50 text-green-300 hover:bg-green-900 border border-green-800/50'
                    }`}>
                    {toggling === selected._id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                      detailData.restaurant.isActive ? 'Suspend' : 'Activate'}
                  </button>
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Restaurant Info</h3>
                  {[
                    { icon: Mail, label: detailData.restaurant.adminEmail },
                    { icon: Phone, label: detailData.restaurant.phone || 'No phone' },
                    { icon: MapPin, label: detailData.restaurant.address || 'No address' },
                    { icon: Calendar, label: `Joined ${new Date(detailData.restaurant.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Icon className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Platform Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Total Orders', value: detailData.stats.orderCount },
                      { label: 'Menu Items', value: detailData.stats.menuCount },
                      { label: 'Revenue Generated', value: `₹${(detailData.stats.totalRevenue || 0).toLocaleString('en-IN')}` },
                      { label: 'Tables', value: detailData.restaurant.tables?.length || 0 },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-800 rounded-xl p-3">
                        <p className="text-xl font-bold text-white">{value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscription */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subscription</h3>
                    <button onClick={() => openSubModal(selected)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> {detailData.subscription ? 'Edit' : 'Add'}
                    </button>
                  </div>
                  {detailData.subscription ? (
                    <div className="bg-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${PLAN_BADGE[detailData.subscription.plan]}`}>
                          {detailData.subscription.plan}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[detailData.subscription.status]}`}>
                          {detailData.subscription.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div className="flex justify-between"><span>Amount</span><span className="text-white font-medium">₹{detailData.subscription.amount}/mo</span></div>
                        <div className="flex justify-between"><span>Expires</span><span className="text-white">{new Date(detailData.subscription.endDate).toLocaleDateString('en-IN')}</span></div>
                        <div className="flex justify-between"><span>Days left</span>
                          <span className={detailData.subscription.daysLeft <= 7 ? 'text-amber-400 font-medium' : 'text-white'}>
                            {detailData.subscription.daysLeft}d
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-4 text-center">
                      <p className="text-slate-500 text-sm">No subscription</p>
                      <button onClick={() => openSubModal(selected)} className="text-violet-400 text-xs mt-1 hover:text-violet-300">+ Assign plan</button>
                    </div>
                  )}
                </div>

                {/* Subscription history */}
                {detailData.subscription?.history?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">History</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {[...detailData.subscription.history].reverse().map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <span className="text-slate-300 font-medium capitalize">{h.action}</span>
                            {h.plan && <span className="text-slate-500 ml-1">→ {h.plan}</span>}
                            <span className="text-slate-600 ml-2">{new Date(h.date).toLocaleDateString('en-IN')}</span>
                            {h.note && <p className="text-slate-500 mt-0.5">{h.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Danger zone */}
                <div className="border border-red-900/50 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Danger Zone</h3>
                  <p className="text-xs text-slate-400 mb-3">Permanently delete this restaurant and all associated data (orders, menu, subscriptions). This cannot be undone.</p>
                  <input
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs mb-2 focus:outline-none focus:border-red-600"
                    placeholder='Type "DELETE" to confirm'
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirm !== 'DELETE' || deleting}
                    className="w-full py-2 bg-red-900/50 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-red-300 text-xs font-semibold rounded-lg border border-red-800/50 transition-all flex items-center justify-center gap-2"
                  >
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete Restaurant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {subModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white">Manage Subscription</h3>
              <button onClick={() => setSubModal(null)} className="p-1.5 hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Restaurant</p>
                <p className="text-white font-medium">{subModal.name}</p>
                <p className="text-slate-400 text-xs">{subModal.adminEmail}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Plan</label>
                <div className="grid grid-cols-4 gap-2">
                  {['trial','basic','pro','enterprise'].map((p) => (
                    <button key={p} type="button" onClick={() => setSubForm((f) => ({ ...f, plan: p, amount: PLAN_PRICES[p] }))}
                      className={`py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${
                        subForm.plan === p ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">End Date</label>
                  <input type="date" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                    value={subForm.endDate} onChange={(e) => setSubForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Monthly Amount (₹)</label>
                  <input type="number" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                    value={subForm.amount} onChange={(e) => setSubForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Notes (optional)</label>
                <textarea className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-violet-500"
                  rows={2} placeholder="e.g. Custom deal, annual payment..." value={subForm.notes}
                  onChange={(e) => setSubForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setSubModal(null)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl border border-slate-700 transition-all">Cancel</button>
                <button onClick={saveSub} disabled={subSaving || !subForm.endDate}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                  {subSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Save Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
