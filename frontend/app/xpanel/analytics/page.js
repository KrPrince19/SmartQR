'use client';
import { useState, useEffect } from 'react';
import { useSuperStore } from '../../../store/useSuperStore';
import { Loader2, TrendingUp, RefreshCw, Store, ShoppingBag, IndianRupee, BarChart3 } from 'lucide-react';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PLAN_COLORS  = { trial: '#64748b', basic: '#3b82f6', pro: '#8b5cf6', enterprise: '#f59e0b' };
const PLAN_BG     = { trial: 'bg-slate-600', basic: 'bg-blue-500', pro: 'bg-violet-500', enterprise: 'bg-amber-500' };

export default function AnalyticsPage() {
  const { superClient } = useSuperStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const client = superClient();
      const { data: res } = await client.get('/analytics');
      setData(res);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
    </div>
  );

  // Build monthly signups for bar chart
  const months = data?.monthlySignups || [];
  const maxCount = Math.max(...months.map((m) => m.count), 1);

  // Plan distribution
  const planDist = data?.planDist || [];
  const totalActiveSubs = planDist.reduce((s, p) => s + p.count, 0);

  // Status dist
  const statusDist = data?.statusDist || [];

  // Top restaurants
  const topRest = data?.topRestaurants || [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Platform-wide insights</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly signups bar chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <Store className="w-4 h-4 text-violet-400" /> New Restaurants
          </h2>
          <p className="text-slate-500 text-xs mb-5">Monthly signups (last 6 months)</p>

          {months.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-600 text-sm">No data yet</p>
            </div>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {months.map((m) => {
                const height = Math.max(8, Math.round((m.count / maxCount) * 140));
                const monthName = MONTH_NAMES[(m._id.month - 1)];
                return (
                  <div key={`${m._id.year}-${m._id.month}`} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-bold text-violet-300">{m.count}</span>
                    <div className="w-full bg-violet-600/20 rounded-t-lg overflow-hidden flex items-end" style={{ height: 140 }}>
                      <div className="w-full bg-violet-500 rounded-t-lg transition-all duration-700" style={{ height }} />
                    </div>
                    <span className="text-xs text-slate-500">{monthName}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan distribution donut-style */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-400" /> Active Plan Distribution
          </h2>
          <p className="text-slate-500 text-xs mb-5">Share of active subscriptions by plan</p>

          {planDist.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-600 text-sm">No active subscriptions</p>
            </div>
          ) : (
            <>
              {/* Stacked bar */}
              <div className="h-8 rounded-xl overflow-hidden flex mb-5">
                {planDist.map((p) => {
                  const pct = totalActiveSubs > 0 ? ((p.count / totalActiveSubs) * 100).toFixed(1) : 0;
                  return (
                    <div key={p._id} className={`${PLAN_BG[p._id] || 'bg-slate-500'} flex items-center justify-center text-white text-xs font-bold transition-all`}
                      style={{ width: `${pct}%` }} title={`${p._id}: ${p.count}`}>
                      {pct > 10 ? `${pct}%` : ''}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                {planDist.map((p) => {
                  const pct = totalActiveSubs > 0 ? ((p.count / totalActiveSubs) * 100).toFixed(1) : 0;
                  return (
                    <div key={p._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full ${PLAN_BG[p._id] || 'bg-slate-500'}`} />
                        <span className="text-sm text-slate-300 capitalize font-medium">{p._id}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500">{p.count} restaurants</span>
                        <span className="text-sm font-bold text-white">₹{p.revenue?.toLocaleString('en-IN')}/mo</span>
                        <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                  <span className="text-slate-400 text-sm font-medium">Total</span>
                  <span className="text-white font-bold">
                    ₹{planDist.reduce((s, p) => s + (p.revenue || 0), 0).toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subscription status breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" /> Subscription Health
          </h2>
          <p className="text-slate-500 text-xs mb-5">Breakdown by subscription status</p>

          {statusDist.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-600 text-sm">No data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statusDist.map((s) => {
                const total = statusDist.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                const colors = {
                  active: { bar: 'bg-green-500', text: 'text-green-400' },
                  expired: { bar: 'bg-red-500', text: 'text-red-400' },
                  suspended: { bar: 'bg-slate-500', text: 'text-slate-400' },
                  cancelled: { bar: 'bg-red-800', text: 'text-red-600' },
                };
                const c = colors[s._id] || { bar: 'bg-slate-500', text: 'text-slate-400' };
                return (
                  <div key={s._id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-semibold capitalize ${c.text}`}>{s._id}</span>
                      <span className="text-white font-bold text-sm">{s.count}</span>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 text-right">{pct}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top restaurants by orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-violet-400" /> Top Restaurants
          </h2>
          <p className="text-slate-500 text-xs mb-5">By total served orders</p>

          {topRest.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-600 text-sm">No order data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topRest.map((r, i) => {
                const maxOrders = topRest[0]?.orderCount || 1;
                const pct = Math.round((r.orderCount / maxOrders) * 100);
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={r._id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{medals[i] || `#${i + 1}`}</span>
                        <span className="text-sm font-semibold text-white truncate max-w-[160px]">{r.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-white text-sm font-bold">{r.orderCount} orders</span>
                        <p className="text-xs text-slate-500">₹{r.revenue?.toLocaleString('en-IN')} rev</p>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
