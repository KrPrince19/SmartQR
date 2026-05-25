'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSuperStore } from '../../store/useSuperStore';
import SuperGuard from './SuperGuard';
import {
  LayoutDashboard, Store, CreditCard, BarChart3,
  LogOut, Menu, X, Shield, ChevronRight, MessageSquare
} from 'lucide-react';

const NAV = [
  { href: '/xpanel/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/xpanel/restaurants', label: 'Restaurants', icon: Store },
  { href: '/xpanel/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/xpanel/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/xpanel/analytics', label: 'Analytics', icon: BarChart3 },
];

function Sidebar({ onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useSuperStore();

  const handleLogout = async () => {
    await logout();
    router.push('/xpanel/login');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">SmartQR</p>
            <p className="text-xs text-violet-400 font-medium">Super Admin</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="px-3 py-2.5 mb-2 bg-slate-800 rounded-xl">
          <p className="text-xs font-semibold text-white truncate">{admin?.name}</p>
          <p className="text-xs text-slate-400 truncate">{admin?.email}</p>
          <span className="inline-flex items-center gap-1 mt-1 text-xs text-violet-400 font-medium">
            <Shield className="w-3 h-3" /> Super Admin
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-full w-64 z-50 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex-shrink-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Super Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function XPanelLayout({ children }) {
  const pathname = usePathname();
  // Login page renders without sidebar/guard
  if (pathname === '/xpanel/login') return <>{children}</>;
  return (
    <SuperGuard>
      <AdminShell>{children}</AdminShell>
    </SuperGuard>
  );
}
