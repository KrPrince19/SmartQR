'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSuperStore } from '../../../store/useSuperStore';
import {
  CreditCard, AlertTriangle, CheckCircle2, XCircle,
  Loader2, RefreshCw, Calendar, IndianRupee, X
} from 'lucide-react';

const PLAN_BADGE = {
  trial:      'bg-slate-700 text-slate-300 border-slate-600',
  basic:      'bg-blue-900/60 text-blue-300 border-blue-700/60',
  pro:        'bg-violet-900/60 text-violet-300 border-violet-700/60',
  enterprise: 'bg-amber-900/60 text-amber-300 border-amber-700/60',
};
const STATUS_ICON = {
  active:    CheckCircle2,
  expired:   XCircle,
  suspended: XCircle,
  cancelled: XCircle,
};
const STATUS_COLOR = {
  active:    'text-green-400',
  expired:   'text-red-400',
  suspended: 'text-slate-400',
  cancelled: 'text-red-500',
};
const PLAN_PRICES = { trial: 0, basic: 999, pro: 2999, enterprise: 7999 };

export default function SubscriptionsPage() {
  const { superClient } = useSuperStore();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [showExpiring, setShowExpiring] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({});

  const client = superClient();

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (showExpiring) params.set('expiring', 'true');
      const { data } = await client.get(`/subscriptions?${params}`);
      setSubs(data.subscriptions || []);

      // Compute summary
      const all = data.subscriptions || [];
      const totalRevenue = all.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.amount || 0), 0);
      const expiringSoon = all.filter(s => {
        const d = Math.ceil((new Date(s.endDate) - new Date()) / 86400000);
        return s.status === 'active' && d <= 7 && d >= 0;
      }).length;
      setSummary({ total: all.length, totalRevenue, expiringSoon });
    } catch {}
    setLoading(false);
  }, [statusFilter, planFilter, showExpiring]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const openEdit = (sub) => {
    setEditForm({
      plan: sub.plan,
      status: sub.status,
      endDate: sub.endDate?.slice(0, 10) || '',
      amount: sub.amount || 0,
      notes: sub.notes || '',
    });
    setEditModal(sub);
  };

  const saveSub = async () => {
    setSaving(true);
    try {
      await client.patch(`/subscriptions/${editModal._id}`, {
        ...editForm,
        amount: Number(editForm.amount),
      });
      await fetchSubs();
      setEditModal(null);
    } catch {}
    setSaving(false);
  };

  const STATUSES = ['all', 'active', 'expired', 'suspended', 'cancelled'];
  const PLANS = ['all', 'trial', 'basic', 'pro', 'enterprise'];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-slate-400 text-sm mt-0.5">{subs.length} total</p>
        </div>
        <button onClick={fetchSubs} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-500 mb-1">Monthly Revenue</p>
          <p className="text-xl font-bold text-white">₹{summary.totalRevenue?.toLocaleString('en-IN') || 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">From active plans</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total Subscriptions</p>
          <p className="text-xl font-bold text-white">{summary.total || 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">All statuses</p>
        </div>
        <div className={`rounded-2xl p-4 border ${summary.expiringSoon > 0 ? 'bg-amber-950/20 border-amber-800/40' : 'bg-slate-900 border-slate-800'}`}>
          <p className="text-xs text-slate-500 mb-1">Expiring Soon</p>
          <p className={`text-xl font-bold ${summary.expiringSoon > 0 ? 'text-amber-400' : 'text-white'}`}>{summary.expiringSoon || 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Within 7 days</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setShowExpiring(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s && !showExpiring ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>{s === 'all' ? 'All Statuses' : s}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
          {PLANS.map((p) => (
            <button key={p} onClick={() => setPlanFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                planFilter === p ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>{p === 'all' ? 'All Plans' : p}</button>
          ))}
        </div>
        <button onClick={() => { setShowExpiring(!showExpiring); setStatusFilter('all'); }}
          className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
            showExpiring ? 'bg-amber-900/40 text-amber-300 border-amber-700/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}>
          <AlertTriangle className="w-3.5 h-3.5" /> Expiring Soon
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>
      ) : subs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No subscriptions found</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800">
              <tr>
                {['Restaurant', 'Plan', 'Status', 'Amount', 'Expires', 'Days Left', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {subs.map((sub) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / 86400000));
                const expiringSoon = sub.status === 'active' && daysLeft <= 7;
                const StatusIcon = STATUS_ICON[sub.status] || CheckCircle2;
                return (
                  <tr key={sub._id} className={`hover:bg-slate-800/40 transition-colors ${expiringSoon ? 'bg-amber-950/10' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white text-sm">{sub.restaurant?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{sub.restaurant?.adminEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${PLAN_BADGE[sub.plan]}`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${STATUS_COLOR[sub.status]}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-semibold text-sm">₹{sub.amount?.toLocaleString('en-IN')}</span>
                      <span className="text-slate-500 text-xs">/mo</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === 'active' ? (
                        <span className={`text-xs font-semibold ${daysLeft <= 3 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-green-400'}`}>
                          {expiringSoon && '⚠ '}{daysLeft}d
                        </span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(sub)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs rounded-lg transition-all">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit subscription modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white">Edit Subscription</h3>
              <button onClick={() => setEditModal(null)} className="p-1.5 hover:bg-slate-800 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Restaurant</p>
                <p className="text-white font-medium">{editModal.restaurant?.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Plan</label>
                <div className="grid grid-cols-4 gap-2">
                  {['trial','basic','pro','enterprise'].map((p) => (
                    <button key={p} type="button"
                      onClick={() => setEditForm((f) => ({ ...f, plan: p, amount: PLAN_PRICES[p] }))}
                      className={`py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${
                        editForm.plan === p ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['active','suspended','cancelled'].map((s) => (
                    <button key={s} type="button"
                      onClick={() => setEditForm((f) => ({ ...f, status: s }))}
                      className={`py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${
                        editForm.status === s
                          ? s === 'active' ? 'bg-green-700 text-white border-green-600'
                            : 'bg-red-900 text-red-200 border-red-700'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">End Date</label>
                  <input type="date"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Amount (₹/mo)</label>
                  <input type="number"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Notes</label>
                <textarea rows={2}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-violet-500"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl border border-slate-700 transition-all">Cancel</button>
                <button onClick={saveSub} disabled={saving}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
