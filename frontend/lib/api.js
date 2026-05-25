import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({ baseURL: `${API_URL}/api` });

export const apiAuth = (token) =>
  axios.create({
    baseURL: `${API_URL}/api`,
    headers: { Authorization: `Bearer ${token}` },
  });

// Helpers
export const formatTableLabel = (num) => {
  if (!num) return '';
  const str = String(num).trim();
  if (str.toLowerCase() === 'takeaway') return 'Takeaway';
  if (/^table/i.test(str)) return str.charAt(0).toUpperCase() + str.slice(1);
  return `Table ${str}`;
};

export const formatCurrency = (amount, currency = '₹') =>
  `${currency}${Number(amount).toFixed(2)}`;

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const STATUS_LABELS = {
  placed: 'Order Placed',
  preparing: 'Preparing',
  ready: 'Ready to Serve',
  served: 'Served',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS = {
  placed: 'status-placed',
  preparing: 'status-preparing',
  ready: 'status-ready',
  served: 'status-served',
  cancelled: 'status-cancelled',
};
