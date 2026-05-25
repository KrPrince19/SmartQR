'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSuperStore } from '../../store/useSuperStore';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SuperGuard({ children }) {
  const { token, admin, logout } = useSuperStore();
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      // No token → redirect to login
      if (!token || !admin) {
        setChecking(false);
        router.replace('/xpanel/login');
        return;
      }

      // Verify token with backend (checks role, active session, etc.)
      try {
        await axios.get(`${API}/api/sx-control/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVerified(true);
      } catch (err) {
        // Token invalid/expired/revoked → force logout and redirect
        await logout();
        router.replace('/xpanel/login');
      }
      setChecking(false);
    };

    verify();
  }, [token, router]);

  if (checking || !verified) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  return children;
}
