'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { QrCode, ChefHat, BarChart3, Wifi, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import FeedbackWidget from '../components/FeedbackWidget';

export default function HomePage() {
  const router = useRouter();
  const { login, register, token, isLoading, error } = useAuthStore();
  const [mode, setMode] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', adminEmail: '', adminPassword: '', description: '', phone: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { if (token) router.push('/admin'); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    const result = mode === 'login'
      ? await login(form.adminEmail, form.adminPassword)
      : await register(form);
    if (!result.success) setMsg(result.message);
  };

  const features = [
    { icon: QrCode, title: 'QR Ordering', desc: 'Customers scan and order instantly' },
    { icon: Wifi, title: 'Real-time Updates', desc: 'Live order tracking via sockets' },
    { icon: ChefHat, title: 'Kitchen Display', desc: 'Smart queue for kitchen staff' },
    { icon: BarChart3, title: 'Sales Analytics', desc: 'Track revenue and orders' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <QrCode className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold">SmartQR</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Modern restaurant ordering, simplified
          </h1>
          <p className="text-orange-100 text-lg leading-relaxed">
            Set up QR menus, manage orders in real-time, and delight your customers — all from one dashboard.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <Icon className="w-6 h-6 mb-3 text-orange-200" />
              <div className="font-semibold mb-1">{title}</div>
              <div className="text-orange-200 text-sm">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">SmartQR</span>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create your restaurant'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {mode === 'login' ? 'Sign in to your dashboard' : 'Set up your SmartQR account'}
            </p>

            {/* Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setMsg(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Restaurant Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. The Spice Garden"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                    <input
                      className="input"
                      placeholder="Authentic Indian cuisine..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                    <input
                      className="input"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
                <input
                  className="input"
                  type="email"
                  placeholder="admin@restaurant.com"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Password *</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'login' && (
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                    Forgot Password?
                  </Link>
                </div>
              )}

              {(msg || error) && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-200">
                  {msg || error}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login' ? 'Sign In' : 'Create Restaurant'}
              </button>
            </form>

            {mode === 'login' && (
              <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
                <p className="text-xs text-orange-700 font-medium mb-1">Demo credentials</p>
                <p className="text-xs text-orange-600">Email: demo@smartqr.app</p>
                <p className="text-xs text-orange-600">Password: demo1234</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Super admin link — subtle, at the bottom left */}
      <div className="fixed bottom-4 left-4">
        <Link
          href="/xpanel/login"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <Shield className="w-3 h-3" />
          Super Admin
        </Link>
      </div>

      <FeedbackWidget />
    </div>
  );
}
