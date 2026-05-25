'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSuperStore } from '../../store/useSuperStore';

export default function XPanelRoot() {
  const { token } = useSuperStore();
  const router = useRouter();
  useEffect(() => {
    router.replace(token ? '/xpanel/dashboard' : '/xpanel/login');
  }, [token]);
  return null;
}
