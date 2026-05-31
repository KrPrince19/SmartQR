'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import Link from 'next/link';
import io from 'socket.io-client';
import {
  LayoutDashboard, UtensilsCrossed, QrCode, ChefHat,
  LogOut, Menu, X, Settings, TableProperties, BarChart3, Bell
} from 'lucide-react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: BarChart3 },
  { href: '/admin/requests', label: 'Service Requests', icon: Bell },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/tables', label: 'Tables & QR', icon: QrCode },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const { token, restaurant, logout, unreadOrders, unreadRequests, incrementUnreadRequests } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastReq, setToastReq] = useState(null);

  useEffect(() => {
    if (!token) router.push('/');
    
    // Setup socket listener for service requests globally in the layout
    let socket;
    if (token && restaurant) {
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      socket.emit('join-restaurant', restaurant._id);
      
      const handleNewRequest = (reqData) => {
        if (pathname !== '/admin/requests') {
          incrementUnreadRequests();
          
          // Audio alert
          try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          } catch (e) {}

          // Toast
          const titles = { need_water: 'Water', call_waiter: 'Waiter', request_bill: 'Bill' };
          setToastReq(`Table ${reqData.tableNumber} requested ${titles[reqData.requestType] || 'Service'}`);
          setTimeout(() => setToastReq(null), 4000);
        }
      };

      socket.on('new-service-request', handleNewRequest);
    }
    
    return () => {
      if (socket) {
        socket.emit('leave-restaurant', restaurant._id);
        socket.disconnect();
      }
    };
  }, [token, restaurant, pathname]);

  if (!token || !restaurant) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isActive = (href, exact) =>
    exact ? pathname === href : pathname.startsWith(href);

  const openKitchen = () => {
    const url = `/kitchen?rid=${restaurant._id}&token=${token}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-50 flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate text-sm">{restaurant.name}</p>
            <p className="text-xs text-gray-400 truncate">SmartQR Admin</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(href, exact)
                  ? 'bg-brand-50 text-brand-700 border border-brand-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              
              {/* Notification Badge for Orders */}
              {label === 'Orders' && unreadOrders > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse-slow">
                  {unreadOrders} NEW
                </span>
              )}
              {/* Notification Badge for Requests */}
              {label === 'Service Requests' && unreadRequests > 0 && (
                <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse-slow">
                  {unreadRequests} NEW
                </span>
              )}
            </Link>
          ))}

          <button
            onClick={openKitchen}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <ChefHat className="w-4 h-4 flex-shrink-0" />
            Kitchen Display ↗
          </button>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-gray-900 truncate">{restaurant.adminEmail}</p>
            <p className="text-xs text-gray-400 truncate">{restaurant.address || 'No address set'}</p>
          </div>
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-xl">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">{restaurant.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          {toastReq && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-full text-sm font-medium shadow-2xl flex items-center gap-3 animate-slide-in">
              <Bell className="w-4 h-4 text-brand-400 animate-bounce" />
              {toastReq}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
