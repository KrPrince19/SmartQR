'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSuperStore } from '../../../store/useSuperStore';
import { MessageSquare, CheckCircle, Clock, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useSuperStore();

  const fetchFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/sx-control/feedback`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbackList(res.data.feedback);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [token]);

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/sx-control/feedback/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedbackList(prev => prev.map(f => f._id === id ? res.data.feedback : f));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3" /> Pending</span>;
      case 'reviewed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><AlertCircle className="w-3 h-3" /> Reviewed</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-violet-500" />
            Customer Feedback
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Review and manage issues or feedback submitted by users.</p>
        </div>
        <button 
          onClick={fetchFeedback}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-1">No feedback yet</h3>
          <p className="text-slate-400 text-sm">When users submit feedback, it will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbackList.map(feedback => (
            <div key={feedback._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-medium">{feedback.name || 'Anonymous User'}</h3>
                    {feedback.restaurantName && (
                      <p className="text-xs text-slate-400 mt-0.5">Restaurant: {feedback.restaurantName}</p>
                    )}
                    <a href={`mailto:${feedback.email}`} className="text-sm text-violet-400 hover:underline block mt-1">{feedback.email}</a>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(feedback.status)}
                    <div className="text-xs text-slate-500 mt-2">
                      {new Date(feedback.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-950 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap border border-slate-800/50">
                  {feedback.message}
                </div>
              </div>

              <div className="flex md:flex-col gap-2 md:w-48 justify-end">
                <select
                  value={feedback.status}
                  onChange={(e) => updateStatus(feedback._id, e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none w-full"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
