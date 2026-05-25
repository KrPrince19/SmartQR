'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { apiAuth } from '../../../lib/api';
import { Save, Loader2, Check, Store, ExternalLink, Copy } from 'lucide-react';

export default function SettingsPage() {
  const { token, restaurant, setAuth, refreshRestaurant } = useAuthStore();
  const [form, setForm] = useState({
    name: '', description: '', address: '', phone: '', currency: '₹',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const client = apiAuth(token);
  const menuUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/restaurant/${restaurant?._id}?table=Table1`;

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        currency: restaurant.currency || '₹',
      });
    }
  }, [restaurant]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await client.put('/auth/me', form);
      setAuth(token, data.restaurant);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const copyMenuUrl = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currencies = ['₹', '$', '€', '£', '¥', '₦', '৳'];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your restaurant profile</p>
      </div>

      {/* Restaurant Profile */}
      <div className="card p-6 mb-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Store className="w-4 h-4 text-brand-500" /> Restaurant Profile
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Restaurant Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Describe your restaurant..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
              <input className="input" placeholder="+91 98765 43210" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Currency</label>
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Address</label>
            <input className="input" placeholder="123 Restaurant Street, City" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Restaurant ID + Menu Link */}
      <div className="card p-6 mb-5">
        <h2 className="font-semibold text-gray-800 mb-4">Restaurant Info</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Restaurant ID</label>
            <div className="bg-gray-50 px-3 py-2 rounded-xl font-mono text-sm text-gray-700 break-all">
              {restaurant?._id}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Sample Menu URL (Table 1)</label>
            <div className="flex gap-2">
              <div className="bg-gray-50 px-3 py-2 rounded-xl text-xs text-gray-600 break-all flex-1 font-mono">
                {menuUrl}
              </div>
              <button onClick={copyMenuUrl} className="btn-secondary px-3 flex-shrink-0 flex items-center gap-1 text-xs">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 flex-shrink-0 flex items-center gap-1 text-xs">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Admin Email</label>
            <div className="bg-gray-50 px-3 py-2 rounded-xl text-sm text-gray-700">
              {restaurant?.adminEmail}
            </div>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Account</h2>
        <p className="text-sm text-gray-600 mb-2">Registered email: <strong>{restaurant?.adminEmail}</strong></p>
        <p className="text-xs text-gray-400">To change your password, please contact support or re-register.</p>
      </div>
    </div>
  );
}
