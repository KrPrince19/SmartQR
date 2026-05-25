'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { apiAuth } from '../../../lib/api';
import {
  Plus, Pencil, Trash2, X, Loader2, Search, ToggleLeft, ToggleRight,
  ChevronDown, ImageIcon, UtensilsCrossed
} from 'lucide-react';

const EMPTY_FORM = {
  name: '', description: '', price: '', category: '',
  image: '', isVeg: true, isAvailable: true, sortOrder: 0,
};

export default function MenuPage() {
  const { token } = useAuthStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [error, setError] = useState('');

  const client = apiAuth(token);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/menu');
      setItems(data.items);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const categories = ['All', ...new Set(items.map((i) => i.category))];

  const filtered = items.filter((item) => {
    const matchCat = catFilter === 'All' || item.category === catFilter;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ ...item, price: String(item.price) });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editing) {
        const { data } = await client.put(`/menu/${editing._id}`, payload);
        setItems((prev) => prev.map((i) => i._id === editing._id ? data.item : i));
      } else {
        const { data } = await client.post('/menu', payload);
        setItems((prev) => [data.item, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save item');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu item?')) return;
    setDeleting(id);
    try {
      await client.delete(`/menu/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {}
    setDeleting(null);
  };

  const toggleAvailability = async (item) => {
    try {
      const { data } = await client.put(`/menu/${item._id}`, { ...item, isAvailable: !item.isAvailable });
      setItems((prev) => prev.map((i) => i._id === item._id ? data.item : i));
    } catch {}
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} items</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                catFilter === cat ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No menu items yet</p>
          <button onClick={openAdd} className="btn-primary">Add First Item</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">{category}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catItems.map((item) => (
                  <div
                    key={item._id}
                    className={`card p-4 flex gap-3 transition-opacity ${!item.isAvailable ? 'opacity-60' : ''}`}
                  >
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1 mb-1">
                        <span className={`mt-0.5 w-3 h-3 rounded-sm border-2 flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                          <span className={`block w-1 h-1 rounded-full m-auto mt-0.5 ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </span>
                        <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                      </div>
                      {item.description && <p className="text-xs text-gray-500 mb-1 line-clamp-1">{item.description}</p>}
                      <p className="font-bold text-gray-900 text-sm">₹{item.price}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          disabled={deleting === item._id}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          {deleting === item._id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                        </button>
                      </div>
                      <button onClick={() => toggleAvailability(item)} className="p-1">
                        {item.isAvailable
                          ? <ToggleRight className="w-5 h-5 text-green-500" />
                          : <ToggleLeft className="w-5 h-5 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Item Name *</label>
                  <input className="input" placeholder="e.g. Paneer Butter Masala" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Price (₹) *</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="199" value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category *</label>
                  <input className="input" placeholder="e.g. Main Course" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })} required />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                  <textarea className="input resize-none" rows={2} placeholder="Brief description..."
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Image URL</label>
                  <input className="input" placeholder="https://..." value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Type</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm({ ...form, isVeg: true })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${form.isVeg ? 'bg-green-50 text-green-700 border-green-300' : 'border-gray-200 text-gray-500'}`}>
                      🟢 Veg
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, isVeg: false })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!form.isVeg ? 'bg-red-50 text-red-700 border-red-300' : 'border-gray-200 text-gray-500'}`}>
                      🔴 Non-Veg
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Availability</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm({ ...form, isAvailable: true })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${form.isAvailable ? 'bg-brand-50 text-brand-700 border-brand-300' : 'border-gray-200 text-gray-500'}`}>
                      Available
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, isAvailable: false })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!form.isAvailable ? 'bg-gray-100 text-gray-600 border-gray-300' : 'border-gray-200 text-gray-500'}`}>
                      Hidden
                    </button>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl border border-red-200">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
