import { useEffect, useState } from 'react';
import { Plus, X, Trash2, AlertCircle, ClipboardList, Calendar } from 'lucide-react';
import { supabase, type FoodItem, type SalesWithItem } from '@/lib/supabase';

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Cold', 'Windy', 'Hot'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return DAYS[(date.getDay() + 6) % 7];
}

export default function SalesData() {
  const [records, setRecords] = useState<SalesWithItem[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    food_item_id: '',
    quantity_prepared: '',
    quantity_sold: '',
    quantity_wasted: '',
    is_holiday: false,
    is_college_event: false,
    weather_condition: 'Sunny',
    special_occasion: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: items } = await supabase.from('food_items').select('*').order('name');
    setFoodItems((items as FoodItem[]) ?? []);

    const { data: sales } = await supabase
      .from('sales_data')
      .select('*, food_items(name, category)')
      .order('date', { ascending: false })
      .limit(200);

    setRecords((sales as SalesWithItem[]) ?? []);
    setLoading(false);

    if (items && items.length > 0 && !form.food_item_id) {
      setForm((f) => ({ ...f, food_item_id: items[0].id }));
    }
  }

  async function handleSave() {
    if (!form.food_item_id) {
      setError('Please select a food item');
      return;
    }
    if (!form.date) {
      setError('Please select a date');
      return;
    }

    const payload = {
      date: form.date,
      food_item_id: form.food_item_id,
      quantity_prepared: parseInt(form.quantity_prepared) || 0,
      quantity_sold: parseInt(form.quantity_sold) || 0,
      quantity_wasted: parseInt(form.quantity_wasted) || 0,
      day_of_week: getDayOfWeek(form.date),
      is_holiday: form.is_holiday,
      is_college_event: form.is_college_event,
      weather_condition: form.weather_condition,
      special_occasion: form.special_occasion.trim(),
    };

    const { error: insertError } = await supabase.from('sales_data').insert(payload);
    if (insertError) {
      if (insertError.code === '23505') {
        setError('A record already exists for this item on this date. Delete the existing one first.');
      } else {
        setError(insertError.message);
      }
      return;
    }

    setShowModal(false);
    setError('');
    setForm({
      ...form,
      quantity_prepared: '',
      quantity_sold: '',
      quantity_wasted: '',
      special_occasion: '',
    });
    await loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sales record?')) return;
    await supabase.from('sales_data').delete().eq('id', id);
    await loadData();
  }

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const pageRecords = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales Data</h2>
          <p className="text-slate-500 mt-1">Enter and manage historical sales records</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Sales Record
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Total Records" value={records.length} color="text-slate-700" />
        <MiniStat
          label="Total Sold"
          value={records.reduce((s, r) => s + r.quantity_sold, 0)}
          color="text-emerald-600"
        />
        <MiniStat
          label="Total Prepared"
          value={records.reduce((s, r) => s + r.quantity_prepared, 0)}
          color="text-amber-600"
        />
        <MiniStat
          label="Total Wasted"
          value={records.reduce((s, r) => s + r.quantity_wasted, 0)}
          color="text-rose-600"
        />
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No sales records yet. Add your first record to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Day</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prepared</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sold</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Wasted</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Weather</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Flags</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                      {r.food_items?.name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{r.day_of_week}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right tabular-nums">{r.quantity_prepared}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600 text-right tabular-nums">{r.quantity_sold}</td>
                    <td className="px-4 py-3 text-sm text-rose-500 text-right tabular-nums">{r.quantity_wasted}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full whitespace-nowrap">
                        {r.weather_condition}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {r.is_holiday && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Hol</span>
                        )}
                        {r.is_college_event && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Evt</span>
                        )}
                        {r.special_occasion && (
                          <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded" title={r.special_occasion}>
                            Occ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, records.length)} of {records.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-lg text-slate-800">Add Sales Record</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-2 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Food Item</label>
                  <select
                    value={form.food_item_id}
                    onChange={(e) => setForm({ ...form, food_item_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all bg-white"
                  >
                    {foodItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prepared</label>
                  <input
                    type="number"
                    value={form.quantity_prepared}
                    onChange={(e) => setForm({ ...form, quantity_prepared: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Sold</label>
                  <input
                    type="number"
                    value={form.quantity_sold}
                    onChange={(e) => setForm({ ...form, quantity_sold: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Wasted</label>
                  <input
                    type="number"
                    value={form.quantity_wasted}
                    onChange={(e) => setForm({ ...form, quantity_wasted: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Weather Condition</label>
                <select
                  value={form.weather_condition}
                  onChange={(e) => setForm({ ...form, weather_condition: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all bg-white"
                >
                  {WEATHER_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_holiday}
                    onChange={(e) => setForm({ ...form, is_holiday: e.target.checked })}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-sm text-slate-700">Holiday</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_college_event}
                    onChange={(e) => setForm({ ...form, is_college_event: e.target.checked })}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-sm text-slate-700">College Event</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Special Occasion</label>
                <input
                  type="text"
                  value={form.special_occasion}
                  onChange={(e) => setForm({ ...form, special_occasion: e.target.value })}
                  placeholder="e.g. Annual Day (optional)"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color} tabular-nums`}>{value.toLocaleString()}</p>
    </div>
  );
}
