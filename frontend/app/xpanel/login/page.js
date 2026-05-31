'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSuperStore } from '../../../store/useSuperStore';
import { Shield, Eye, EyeOff, Loader2, Lock, AlertTriangle } from 'lucide-react';

export default function SuperLoginPage() {
  const router = useRouter();
  const { login, token, isLoading, error } = useSuperStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [attempts, setAttempts] = useState(0);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (token) router.replace('/xpanel/dashboard');
  }, [token, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    const result = await login(email.trim(), password);
    if (result.success) {
      router.replace('/xpanel/dashboard');
    } else {
      setAttempts((a) => a + 1);
      setMsg(result.message);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-violet-900/50">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Platform Control</h1>
          <p className="text-slate-500 text-sm">Restricted access — authorised personnel only</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Security notice */}
          <div className="flex items-start gap-2.5 bg-violet-950/40 border border-violet-800/40 rounded-xl px-4 py-3 mb-6">
            <Lock className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-300">
              This panel is monitored. Unauthorised access attempts are logged and may be reported.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Admin Email</label>
              <input
                type="email"
                autoComplete="off"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-colors"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="off"
                  className="w-full px-4 py-3 pr-11 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-colors"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/xpanel/forgot-password" className="text-xs font-medium text-violet-400 hover:text-violet-300">
                Forgot Password?
              </Link>
            </div>

            {/* Error message */}
            {(msg || error) && (
              <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 text-sm">{msg || error}</p>
                  {attempts >= 3 && (
                    <p className="text-red-500 text-xs mt-1">Account will lock after 5 failed attempts.</p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                <><Shield className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          SmartQR Platform v1.0 · All access is logged
        </p>
      </div>
    </div>
  );
}
