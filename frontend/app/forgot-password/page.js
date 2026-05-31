'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
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
      const { data } = await api.post('/auth/forgot-password', { adminEmail: email });
      setMsg(data.message || 'Email sent successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Forgot Password</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your email address and we'll send you a link to reset your password.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  className="input pl-10 w-full"
                  placeholder="admin@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
