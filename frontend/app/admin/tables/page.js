'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { apiAuth, formatTableLabel } from '../../../lib/api';
import { Plus, Trash2, QrCode, X, Download, Loader2, TableProperties, Copy, Check } from 'lucide-react';

export default function TablesPage() {
  const { token, restaurant, refreshRestaurant } = useAuthStore();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTable, setNewTable] = useState('');
  const [saving, setSaving] = useState(false);
  const [qrModal, setQrModal] = useState(null); // { table, qr, url }
  const [qrLoading, setQrLoading] = useState(null);
  const [copied, setCopied] = useState(null);

  const client = apiAuth(token);

  const fetchTables = async () => {
    try {
      const { data } = await client.get('/tables');
      setTables(data.tables);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTables(); }, []);

  const addTable = async () => {
    const name = newTable.trim();
    if (!name || tables.includes(name)) return;
    setSaving(true);
    try {
      const updated = [...tables, name];
      const { data } = await client.put('/tables', { tables: updated });
      setTables(data.tables);
      setNewTable('');
      refreshRestaurant();
    } catch {}
    setSaving(false);
  };

  const removeTable = async (table) => {
    if (!confirm(`Remove "${formatTableLabel(table)}"?`)) return;
    try {
      const updated = tables.filter((t) => t !== table);
      const { data } = await client.put('/tables', { tables: updated });
      setTables(data.tables);
      refreshRestaurant();
    } catch {}
  };

  const loadQR = async (table) => {
    setQrLoading(table);
    try {
      const { data } = await client.get(`/tables/qr/${encodeURIComponent(table)}`);
      setQrModal({ table, qr: data.qr, url: data.url });
    } catch {}
    setQrLoading(null);
  };

  const downloadQR = (table, qr) => {
    const a = document.createElement('a');
    a.href = qr;
    a.download = `QR-${formatTableLabel(table)}.png`;
    a.click();
  };

  const copyUrl = (url, table) => {
    navigator.clipboard.writeText(url);
    setCopied(table);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tables & QR Codes</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage dining tables and generate QR codes for customers</p>
      </div>

      {/* Add table */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Add New Table</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              className="input"
              placeholder="Table name (e.g. Table5, VIP-Room, Takeaway)"
              value={newTable}
              onChange={(e) => setNewTable(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTable()}
            />
            <p className="text-xs text-gray-400 mt-1">
              Tip: Names like "Table1", "VIP1", or "Takeaway" work great
            </p>
          </div>
          <button
            onClick={addTable}
            disabled={saving || !newTable.trim()}
            className="btn-primary flex items-center gap-2 px-5 self-start"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
      </div>

      {/* Tables grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
        </div>
      ) : tables.length === 0 ? (
        <div className="card p-12 text-center">
          <TableProperties className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tables yet. Add your first table above.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map((table) => (
            <div key={table} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TableProperties className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{formatTableLabel(table)}</p>
                  <p className="text-xs text-gray-400">ID: {table}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => loadQR(table)}
                  disabled={qrLoading === table}
                  className="p-2 hover:bg-brand-50 rounded-xl transition-colors text-brand-500 hover:text-brand-600"
                  title="View QR Code"
                >
                  {qrLoading === table ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => removeTable(table)}
                  className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-500"
                  title="Remove table"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restaurant QR info */}
      <div className="card p-5 mt-6 bg-orange-50 border-orange-200">
        <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
          <QrCode className="w-4 h-4" /> How to use QR codes
        </h3>
        <ul className="text-sm text-orange-700 space-y-1">
          <li>• Click the QR icon on any table to generate and download its QR code</li>
          <li>• Print and place QR codes on the respective tables</li>
          <li>• Customers scan to access the menu directly on their phone</li>
          <li>• Each QR code is linked to the table so orders are tracked automatically</li>
        </ul>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                QR Code — {formatTableLabel(qrModal.table)}
              </h3>
              <button onClick={() => setQrModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 text-center">
              <div className="bg-white p-3 rounded-2xl inline-block border-2 border-gray-100 mb-4 shadow-inner">
                <img src={qrModal.qr} alt="QR Code" className="w-48 h-48" />
              </div>

              <p className="text-sm font-semibold text-gray-800 mb-1">{restaurant.name}</p>
              <p className="text-sm text-gray-500 mb-4">{formatTableLabel(qrModal.table)}</p>

              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left">
                <p className="text-xs text-gray-500 mb-1">Menu URL</p>
                <p className="text-xs text-gray-700 break-all font-mono">{qrModal.url}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyUrl(qrModal.url, qrModal.table)}
                  className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  {copied === qrModal.table ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied === qrModal.table ? 'Copied!' : 'Copy URL'}
                </button>
                <button
                  onClick={() => downloadQR(qrModal.table, qrModal.qr)}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
