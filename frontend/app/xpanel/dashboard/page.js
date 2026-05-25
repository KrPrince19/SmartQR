'use client';
import { useState, useEffect } from 'react';
import { useSuperStore } from '../../../store/useSuperStore';
import Link from 'next/link';
import {
  Store, CreditCard, TrendingUp, AlertTriangle, Users,
  CheckCircle2, XCircle, Clock, IndianRupee, Loader2,
  RefreshCw, ArrowRight, ShoppingBag, FlaskConical
} from 'lucide-react';

const PLAN_COLORS = {
  trial: 'bg-slate-700 text-slate-300',
  basic: 'bg-blue-900/50 text-blue-300 border border-blue-800/50',
  pro: 'bg-violet-900/50 text-violet-300 border border-violet-800/50',
  enterprise: 'bg-amber-900/50 text-amber-300 border border-amber-800/50',
};

const PLAN_AMOUNTS = { trial: 0, basic: 999, pro: 2999, enterprise: 7999 };

export default function SuperDashboard() {
  const { superClient } = useSuperStore();
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const client = superClient();
      const [statsRes, expiringRes] = await Promise.all([
        client.get('/stats'),
        client.get('/subscriptions?expiring=true'),
      ]);
      setStats(statsRes.data);
      setExpiring(expiringRes.data.subscriptions || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = stats ? [
    {
      label: 'Total Restaurants', value: stats.totalRestaurants,
      icon: Store, color: 'violet',
      sub: `${stats.newThisMonth} new this month`,
    },
    {
      label: 'Active Subscriptions', value: stats.activeSubscriptions,
      icon: CheckCircle2, color: 'green',
      sub: `${stats.trialSubscriptions} on trial`,
    },
    {
      label: 'Monthly Revenue', value: `₹${(stats.monthlyRevenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee, color: 'amber',
      sub: 'From active plans',
    },
    {
      label: 'Expiring Soon', value: stats.expiringSoon,
      icon: AlertTriangle, color: stats.expiringSoon > 0 ? 'red' : 'slate',
      sub: 'Within 7 days',
    },
    {
      label: 'Suspended', value: stats.suspendedRestaurants,
      icon: XCircle, color: 'red',
      sub: 'Inactive accounts',
    },
    {
      label: 'Total Orders', value: stats.totalOrders?.toLocaleString('en-IN'),
      icon: ShoppingBag, color: 'blue',
      sub: 'Across all restaurants',
    },
  ] : [];

  const colorMap = {
    violet: { card: 'border-violet-800/30 bg-violet-950/20', icon: 'bg-violet-900/60 text-violet-300', val: 'text-violet-200' },
    green:  { card: 'border-green-800/30 bg-green-950/20',  icon: 'bg-green-900/60 text-green-300',  val: 'text-green-200' },
    amber:  { card: 'border-amber-800/30 bg-amber-950/20',  icon: 'bg-amber-900/60 text-amber-300',  val: 'text-amber-200' },
    red:    { card: 'border-red-800/30 bg-red-950/20',      icon: 'bg-red-900/60 text-red-300',      val: 'text-red-200' },
    blue:   { card: 'border-blue-800/30 bg-blue-950/20',    icon: 'bg-blue-900/60 text-blue-300',    val: 'text-blue-200' },
    slate:  { card: 'border-slate-700/30 bg-slate-800/20',  icon: 'bg-slate-700 text-slate-300',     val: 'text-slate-200' },
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, sub }) => {
          const c = colorMap[color];
          return (
            <div key={label} className={`rounded-2xl border p-4 ${c.card}`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-slate-400">{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-2xl font-bold mb-0.5 ${c.val}`}>{value}</p>
              <p className="text-xs text-slate-500">{sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expiring subscriptions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Expiring Soon
              {expiring.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-900/50 text-amber-300 border border-amber-800/50">
                  {expiring.length}
                </span>
              )}
            </h2>
            <Link href="/xpanel/subscriptions?filter=expiring" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {expiring.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No subscriptions expiring in 7 days</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expiring.map((sub) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / 86400000));
                return (
                  <div key={sub._id} className="bg-slate-900 border border-amber-800/30 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{sub.restaurant?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{sub.restaurant?.adminEmail}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${PLAN_COLORS[sub.plan]}`}>
                        {sub.plan}
                      </span>
                      <p className={`text-xs font-semibold ${daysLeft <= 2 ? 'text-red-400' : 'text-amber-400'}`}>
                        {daysLeft === 0 ? 'Expires today' : `${daysLeft}d left`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue by plan */}
        <div>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-violet-400" />
            Revenue by Plan
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            {stats?.revenueByPlan?.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No active subscriptions yet</p>
            )}
            {stats?.revenueByPlan?.map((r) => {
              const maxRev = Math.max(...(stats.revenueByPlan.map((x) => x.total) || [1]), 1);
              const pct = Math.round((r.total / maxRev) * 100);
              const planColor = { trial: 'bg-slate-600', basic: 'bg-blue-500', pro: 'bg-violet-500', enterprise: 'bg-amber-500' };
              return (
                <div key={r._id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${planColor[r._id] || 'bg-slate-500'}`} />
                      <span className="text-sm text-slate-300 capitalize font-medium">{r._id}</span>
                      <span className="text-xs text-slate-500">{r.count} restaurants</span>
                    </div>
                    <span className="text-sm font-bold text-white">₹{r.total?.toLocaleString('en-IN')}/mo</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${planColor[r._id] || 'bg-slate-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {stats?.monthlyRevenue > 0 && (
              <div className="border-t border-slate-800 pt-3 flex justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Monthly</span>
                <span className="text-white font-bold">₹{stats.monthlyRevenue?.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
