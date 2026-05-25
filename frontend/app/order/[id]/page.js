'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api, formatTableLabel, STATUS_LABELS } from '../../../lib/api';
import io from 'socket.io-client';
import {
  ClipboardList, ChefHat, Bell, CheckCircle2, XCircle,
  Loader2, AlertCircle, Clock, RefreshCw, BellRing, AlertTriangle
} from 'lucide-react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: ClipboardList, color: 'blue' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'amber' },
  { key: 'ready', label: 'Ready', icon: Bell, color: 'green' },
  { key: 'served', label: 'Served', icon: CheckCircle2, color: 'gray' },
];

const stepIndex = (status) => STEPS.findIndex((s) => s.key === status);

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  // Alert state
  const [alertSent, setAlertSent] = useState(false);   // showed success message
  const [cooldownLeft, setCooldownLeft] = useState(0); // seconds remaining
  const socketRef = useRef(null);
  const cooldownRef = useRef(null);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
      setLoading(false);
    } catch {
      setError('Order not found');
      setLoading(false);
    }
  };

  // Restore cooldown from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`alert-cooldown-${id}`);
    if (stored) {
      const remaining = Math.ceil((Number(stored) - Date.now()) / 1000);
      if (remaining > 0) startCooldownTimer(remaining);
    }
  }, [id]);

  const startCooldownTimer = (seconds) => {
    clearInterval(cooldownRef.current);
    setCooldownLeft(seconds);
    cooldownRef.current = setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          setAlertSent(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendAlert = () => {
    if (cooldownLeft > 0 || !order) return;
    const socket = socketRef.current;
    if (!socket) return;
    const restaurantId = order.restaurant?._id || order.restaurant;
    socket.emit('customer-alert', {
      orderId: id,
      restaurantId,
      tableNumber: order.tableNumber,
      orderNumber: order.orderNumber,
    });
    // Optimistic: apply cooldown immediately on client
    const expiresAt = Date.now() + COOLDOWN_MS;
    localStorage.setItem(`alert-cooldown-${id}`, String(expiresAt));
    setAlertSent(true);
    startCooldownTimer(600); // 600 seconds = 10 min
  };

  // Clean up interval on unmount
  useEffect(() => () => clearInterval(cooldownRef.current), []);

  useEffect(() => {
    fetchOrder();

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join-order', id);

    socket.on('order-updated', ({ status }) => {
      setOrder((prev) => prev ? { ...prev, status } : prev);
      setLastUpdate(new Date());
      // Play notification sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    });

    // Server rejected alert (cooldown not expired server-side)
    socket.on('alert-cooldown', ({ retryAfterMs }) => {
      const remaining = Math.ceil(retryAfterMs / 1000);
      startCooldownTimer(remaining);
    });

    return () => {
      socket.emit('leave-order', id);
      socket.disconnect();
    };
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-4">
      <div className="card p-8 text-center max-w-sm w-full">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="font-semibold text-lg mb-2">Order Not Found</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  const currentStep = stepIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const currency = order.restaurant?.currency || '₹';

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {order.restaurant?.name || 'Your Order'}
          </h1>
          <p className="text-gray-500 text-sm">
            {formatTableLabel(order.tableNumber)}
          </p>
          {lastUpdate && (
            <p className="text-xs text-brand-600 mt-1 flex items-center justify-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Updated {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Tracking tip banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 mb-0.5">Order Tracking Tip</p>
            <p className="text-xs text-blue-700">
              If you want to track your order, please do not close this page. Otherwise, you may close it.
            </p>
          </div>
        </div>

        {/* Cancelled state */}
        {isCancelled ? (
          <div className="card p-6 text-center border-red-200 bg-red-50 mb-6">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="font-bold text-red-800 text-lg mb-2">Order Cancelled</h2>
            <p className="text-red-700 text-sm">
              Your order has been cancelled. Please contact the front desk for assistance.
            </p>
          </div>
        ) : (
          /* Progress timeline */
          <div className="card p-6 mb-6">
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 z-0">
                <div
                  className="h-full bg-brand-500 transition-all duration-700"
                  style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />
              </div>

              <div className="relative z-10 flex justify-between">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const done = idx <= currentStep;
                  const active = idx === currentStep;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                        done
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                          : 'bg-white border-2 border-gray-200 text-gray-400'
                      } ${active ? 'scale-110 ring-4 ring-brand-500/20' : ''}`}>
                        <Icon className={`w-5 h-5 ${active ? 'animate-pulse-slow' : ''}`} />
                      </div>
                      <span className={`text-xs font-medium text-center max-w-[60px] leading-tight ${
                        done ? 'text-brand-600' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                order.status === 'ready' ? 'bg-green-100 text-green-700 animate-pulse' :
                order.status === 'preparing' ? 'bg-amber-100 text-amber-700' :
                order.status === 'served' ? 'bg-gray-100 text-gray-600' :
                'bg-blue-100 text-blue-700'
              }`}>
                {order.status === 'preparing' && <ChefHat className="w-4 h-4" />}
                {order.status === 'ready' && <Bell className="w-4 h-4" />}
                {order.status === 'served' && <CheckCircle2 className="w-4 h-4" />}
                {order.status === 'placed' && <Clock className="w-4 h-4" />}
                {STATUS_LABELS[order.status]}
              </span>
              {order.status === 'ready' && (
                <p className="text-sm text-green-700 mt-2 font-medium">
                  🎉 Your order is ready! Please collect from the counter.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="card p-6 mb-4">
          <h3 className="font-semibold text-gray-800 mb-4">Order Details</h3>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                    <span className={`block w-1.5 h-1.5 rounded-full m-auto mt-px ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </span>
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-xs text-gray-400">× {item.quantity}</span>
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {currency}{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {order.customerNote && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Special instructions</p>
              <p className="text-sm text-gray-700 italic">"{order.customerNote}"</p>
            </div>
          )}

          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="font-bold text-lg text-gray-900">
              {currency}{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* ── Call Staff Alert Button ── */}
        {!isCancelled && order.status !== 'served' && (
          <div className="mb-4">
            {alertSent && cooldownLeft > 0 ? (
              // Success state — countdown
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BellRing className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Staff has been notified!</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You can alert again in{' '}
                    <span className="font-bold">
                      {Math.floor(cooldownLeft / 60)}:{String(cooldownLeft % 60).padStart(2, '0')}
                    </span>
                  </p>
                </div>
              </div>
            ) : cooldownLeft > 0 ? (
              // Cooldown but alert not freshly sent
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-500">
                  Alert available in{' '}
                  <span className="font-semibold text-gray-700">
                    {Math.floor(cooldownLeft / 60)}:{String(cooldownLeft % 60).padStart(2, '0')}
                  </span>
                </p>
              </div>
            ) : (
              // Ready to alert
              <button
                onClick={sendAlert}
                className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 hover:bg-red-100 active:bg-red-200 border-2 border-red-200 hover:border-red-300 rounded-2xl transition-all group"
              >
                <div className="w-9 h-9 bg-red-100 group-hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors">
                  <BellRing className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-red-700">Call Staff</p>
                  <p className="text-xs text-red-500">Tap if your order is taking too long</p>
                </div>
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Order placed at {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
