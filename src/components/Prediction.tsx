import { useEffect, useState } from 'react';
import {
  BrainCircuit,
  Calendar,
  CloudSun,
  PartyPopper,
  School,
  TrendingUp,
  Sparkles,
  Gauge,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { supabase, type FoodItem, type SalesRecord } from '@/lib/supabase';
import { predictDemand, getDayOfWeek, type PredictionResult } from '@/lib/prediction';

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Cold', 'Windy', 'Hot'];

export default function Prediction() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [historicalData, setHistoricalData] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);

  const [form, setForm] = useState({
    food_item_id: '',
    targetDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    isHoliday: false,
    isCollegeEvent: false,
    weatherCondition: 'Sunny',
    specialOccasion: '',
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
      .select('*')
      .order('date', { ascending: true })
      .limit(1000);

    setHistoricalData((sales as SalesRecord[]) ?? []);
    setLoading(false);

    if (items && items.length > 0) {
      setForm((f) => ({ ...f, food_item_id: items[0].id }));
    }
  }

  function handlePredict() {
    if (!form.food_item_id || !form.targetDate) return;
    setPredicting(true);
    const dow = getDayOfWeek(form.targetDate);
    const prediction = predictDemand(
      {
        foodItemId: form.food_item_id,
        targetDate: form.targetDate,
        dayOfWeek: dow,
        isHoliday: form.isHoliday,
        isCollegeEvent: form.isCollegeEvent,
        weatherCondition: form.weatherCondition,
        specialOccasion: form.specialOccasion,
      },
      historicalData,
      foodItems
    );
    setResult(prediction);
    setPredicting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  const selectedItem = foodItems.find((i) => i.id === form.food_item_id);
  const dow = form.targetDate ? getDayOfWeek(form.targetDate) : '';

  // Chart data from factors
  const factorChartData =
    result?.factors
      .filter((f) => f.label !== 'Base Demand (Historical Average)')
      .map((f) => ({
        name: f.label.length > 15 ? f.label.slice(0, 13) + '...' : f.label,
        impact: parseFloat((f.impact * 100).toFixed(0)),
      })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">AI Demand Prediction</h2>
        <p className="text-slate-500 mt-1">Predict food demand for any future date using historical patterns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Prediction Inputs</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Food Item</label>
              <select
                value={form.food_item_id}
                onChange={(e) => setForm({ ...form, food_item_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all bg-white"
              >
                {foodItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Day of week: {dow}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Weather Condition</label>
              <div className="relative">
                <CloudSun className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={form.weatherCondition}
                  onChange={(e) => setForm({ ...form, weatherCondition: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all bg-white"
                >
                  {WEATHER_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 px-3 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.isHoliday}
                  onChange={(e) => setForm({ ...form, isHoliday: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
                <PartyPopper className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">Holiday</span>
              </label>
              <label className="flex items-center gap-2.5 px-3 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.isCollegeEvent}
                  onChange={(e) => setForm({ ...form, isCollegeEvent: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
                <School className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">College Event</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Special Occasion</label>
              <input
                type="text"
                value={form.specialOccasion}
                onChange={(e) => setForm({ ...form, specialOccasion: e.target.value })}
                placeholder="e.g. Annual Day (optional)"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={handlePredict}
              disabled={predicting || !form.food_item_id}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Sparkles className="w-5 h-5" />
              {predicting ? 'Predicting...' : 'Predict Demand'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Main Result */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm">Predicted Demand for</p>
                    <p className="font-semibold text-lg">{selectedItem?.name ?? 'Selected Item'}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {dow}, {new Date(form.targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-5xl font-bold text-amber-400">{result.predictedQuantity}</p>
                    <p className="text-slate-400 text-sm mt-1">units recommended</p>
                  </div>
                </div>

                {/* Confidence */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-slate-300">Confidence Level</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{result.confidence}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400">Avg Sold</p>
                    <p className="text-xl font-bold text-white mt-0.5">{result.averageSold}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400">Recent Avg</p>
                    <p className="text-xl font-bold text-white mt-0.5">{result.recentTrend}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400">Base Demand</p>
                    <p className="text-xl font-bold text-white mt-0.5">{result.baseDemand}</p>
                  </div>
                </div>
              </div>

              {/* Factor Impact Chart */}
              {factorChartData.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-slate-800 mb-1">Factor Impact Analysis</h3>
                  <p className="text-sm text-slate-500 mb-4">How each factor adjusts the prediction (100% = no change)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={factorChartData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" domain={[0, 150]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                      <Tooltip
                        contentStyle={{
                          background: '#1e293b',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                        formatter={(v) => [`${v}%`, 'Impact']}
                      />
                      <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                        {factorChartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.impact >= 100 ? '#10b981' : entry.impact >= 70 ? '#f59e0b' : '#f43f5e'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Factor Details */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-3">Prediction Breakdown</h3>
                <div className="space-y-2">
                  {result.factors.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{f.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{f.detail}</p>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular-nums ml-3 shrink-0 ${
                          f.impact > 1
                            ? 'text-emerald-600'
                            : f.impact < 1
                            ? 'text-rose-500'
                            : 'text-slate-500'
                        }`}
                      >
                        {(f.impact * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Recommendation</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Prepare approximately <span className="font-bold">{result.predictedQuantity} units</span> of{' '}
                      {selectedItem?.name ?? 'this item'} for the selected date.
                      {result.confidence >= 70
                        ? ' High confidence based on sufficient historical data.'
                        : result.confidence >= 40
                        ? ' Moderate confidence - consider adding more sales data for better accuracy.'
                        : ' Low confidence - limited historical data available. Add more sales records to improve predictions.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BrainCircuit className="w-8 h-8 text-amber-400" />
              </div>
              <p className="font-medium text-slate-700">Ready to Predict</p>
              <p className="text-sm text-slate-500 mt-1">
                Fill in the prediction inputs and click "Predict Demand" to see the AI-powered forecast.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
