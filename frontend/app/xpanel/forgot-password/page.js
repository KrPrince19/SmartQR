'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Loader2, ArrowLeft, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

export default function SuperForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg('');
    setError('');

    try {
      const { data } = await api.post('/sx-control/auth/forgot-password', { email });
      setMsg(data.message || 'Email sent successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-violet-900/50">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Platform Control</h1>
          <p className="text-slate-500 text-sm">Forgot Password</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <Link href="/xpanel/login" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Admin Email</label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-colors"
                  placeholder="superadmin@smartqr.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {msg && (
              <div className="bg-green-950/40 text-green-400 text-sm px-4 py-3 rounded-xl border border-green-800/50">
                {msg}
              </div>
            )}
            
            {error && (
              <div className="bg-red-950/40 text-red-400 text-sm px-4 py-3 rounded-xl border border-red-800/50">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
