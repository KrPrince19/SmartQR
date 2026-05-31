'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { Loader2, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function ResetPassword() {
  const router = useRouter();
  const params = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setMsg('');
    setError('');

    try {
      const { data } = await api.post(`/auth/reset-password/${params.token}`, { password });
      setMsg(data.message || 'Password updated successfully. Redirecting to login...');
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-xl border border-gray-100">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pl-10 pr-10 w-full"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pl-10 pr-10 w-full"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {msg && (
              <div className="bg-green-50 text-green-700 text-sm px-3 py-2.5 rounded-xl border border-green-200">
                {msg}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
