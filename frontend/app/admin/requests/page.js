'use client';
import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { Droplet, Bell, Receipt, CheckCircle, Clock, Check } from 'lucide-react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const REQ_TYPES = {
  need_water: { title: 'Need Water', icon: Droplet, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  call_waiter: { title: 'Call Waiter', icon: Bell, color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  request_bill: { title: 'Request Bill', icon: Receipt, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
};

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getHeaders, clearUnreadRequests, restaurant } = useAuthStore();

  useEffect(() => {
    clearUnreadRequests();
    fetchRequests();

    if (!restaurant) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.emit('join-restaurant', restaurant._id);

    socket.on('new-service-request', (req) => {
      setRequests((prev) => [req, ...prev]);
      clearUnreadRequests();
    });

    socket.on('update-service-request', (updatedReq) => {
      setRequests((prev) => {
        if (updatedReq.status === 'completed') {
          return prev.filter((r) => r._id !== updatedReq._id);
        }
        return prev.map((r) => r._id === updatedReq._id ? updatedReq : r);
      });
    });

    return () => {
      socket.emit('leave-restaurant', restaurant._id);
      socket.disconnect();
    };
  }, [restaurant]);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/service-requests', { headers: getHeaders() });
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      // Optimistic update
      if (status === 'completed') {
        setRequests((prev) => prev.filter((r) => r._id !== id));
      } else {
        setRequests((prev) => prev.map((r) => r._id === id ? { ...r, status } : r));
      }

      await api.patch(`/service-requests/${id}`, { status }, { headers: getHeaders() });
    } catch (err) {
      console.error(err);
      fetchRequests(); // revert on fail
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Service Requests</h1>
          <p className="text-gray-500 text-sm">Manage real-time customer requests</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[40vh] border-dashed border-2 border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">All caught up!</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">There are no pending service requests at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => {
            const typeInfo = REQ_TYPES[req.requestType] || { title: 'Unknown', icon: Bell, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' };
            const Icon = typeInfo.icon;
            
            return (
              <div key={req._id} className={`card p-5 border-l-4 ${typeInfo.border} hover:shadow-lg transition-all animate-fade-in`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeInfo.bg} ${typeInfo.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">Table {req.tableNumber}</h3>
                      <p className={`text-sm font-medium ${typeInfo.color}`}>{typeInfo.title}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-md">
                    {formatDistanceToNow(new Date(req.createdAt))} ago
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                  {req.status === 'pending' ? (
                    <button
                      onClick={() => updateStatus(req._id, 'in_progress')}
                      className="flex-1 py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" /> Acknowledge
                    </button>
                  ) : (
                    <div className="flex-1 py-2 bg-orange-50 text-orange-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" /> In Progress
                    </div>
                  )}
                  
                  <button
                    onClick={() => updateStatus(req._id, 'completed')}
                    className="flex-1 py-2 bg-green-500 text-white hover:bg-green-600 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Done
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
