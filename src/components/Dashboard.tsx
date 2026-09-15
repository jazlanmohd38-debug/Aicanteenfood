import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Trash2,
  CalendarClock,
  ShoppingBag,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import { supabase, type FoodItem, type SalesWithItem } from '@/lib/supabase';

interface DashboardData {
  todayPrediction: number;
  totalSoldToday: number;
  estimatedWaste: number;
  mostDemanded: { name: string; sold: number } | null;
  lowDemand: { name: string; sold: number } | null;
  upcomingHighDemandDay: { day: string; reason: string } | null;
  weeklyData: { day: string; sold: number; prepared: number }[];
  monthlyData: { week: string; sales: number }[];
  wasteData: { date: string; waste: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Fetch food items
    const { data: foodItems } = await supabase.from('food_items').select('*');

    // Fetch last 60 days of sales with food item names
    const { data: sales } = await supabase
      .from('sales_data')
      .select('*, food_items(name, category)')
      .order('date', { ascending: true })
      .limit(600);

    if (!sales || !foodItems) {
      setLoading(false);
      return;
    }

    const typedSales = sales as SalesWithItem[];
    const typedItems = foodItems as FoodItem[];

    // Today's data (most recent date in DB)
    const latestDate = typedSales.length > 0 ? typedSales[typedSales.length - 1].date : todayStr;
    const todayRecords = typedSales.filter((r) => r.date === latestDate);

    const totalSoldToday = todayRecords.reduce((sum, r) => sum + r.quantity_sold, 0);
    const estimatedWaste = todayRecords.reduce((sum, r) => sum + r.quantity_wasted, 0);

    // Most/least demanded today
    const itemSalesToday = new Map<string, { name: string; sold: number }>();
    for (const r of todayRecords) {
      const name = r.food_items?.name ?? 'Unknown';
      const existing = itemSalesToday.get(r.food_item_id);
      if (existing) {
        existing.sold += r.quantity_sold;
      } else {
        itemSalesToday.set(r.food_item_id, { name, sold: r.quantity_sold });
      }
    }
    const sortedItems = [...itemSalesToday.values()].sort((a, b) => b.sold - a.sold);
    const mostDemanded = sortedItems[0] ?? null;
    const lowDemand = sortedItems[sortedItems.length - 1] ?? null;

    // Predicted demand for today (sum of average sold per item * day factor)
    const dow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    const dayFactor = dow === 'Sunday' ? 0.4 : dow === 'Saturday' ? 0.7 : 1.0;
    const avgPerItem =
      typedSales.length > 0
        ? typedSales.reduce((sum, r) => sum + r.quantity_sold, 0) / typedSales.length
        : 0;
    const todayPrediction = Math.round(avgPerItem * typedItems.length * dayFactor);

    // Upcoming high demand day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowDow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tomorrow.getDay()];
    let upcomingHighDemandDay: DashboardData['upcomingHighDemandDay'] = null;
    if (tomorrowDow !== 'Sunday' && tomorrowDow !== 'Saturday') {
      upcomingHighDemandDay = { day: tomorrowDow, reason: 'Weekday - high canteen traffic' };
    } else if (tomorrowDow === 'Saturday') {
      upcomingHighDemandDay = { day: 'Monday', reason: 'Next weekday after weekend' };
    } else {
      upcomingHighDemandDay = { day: 'Monday', reason: 'Start of week - high demand' };
    }

    // Weekly data: last 7 days
    const last7 = typedSales.slice(-7 * typedItems.length);
    const weeklyMap = new Map<string, { sold: number; prepared: number }>();
    for (const r of last7) {
      const existing = weeklyMap.get(r.day_of_week);
      if (existing) {
        existing.sold += r.quantity_sold;
        existing.prepared += r.quantity_prepared;
      } else {
        weeklyMap.set(r.day_of_week, { sold: r.quantity_sold, prepared: r.quantity_prepared });
      }
    }
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const weeklyData = dayOrder
      .filter((d) => weeklyMap.has(d))
      .map((d) => ({ day: d.slice(0, 3), sold: weeklyMap.get(d)!.sold, prepared: weeklyMap.get(d)!.prepared }));

    // Monthly data: group by week over last ~28 days
    const last28 = typedSales.slice(-28 * typedItems.length);
    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 4; i++) {
      const weekStart = i * 7 * typedItems.length;
      const weekSlice = last28.slice(weekStart, weekStart + 7 * typedItems.length);
      const total = weekSlice.reduce((sum, r) => sum + r.quantity_sold, 0);
      monthlyMap.set(`Week ${i + 1}`, total);
    }
    const monthlyData = [...monthlyMap.entries()].map(([week, sales]) => ({ week, sales }));

    // Waste trend: last 14 days
    const last14 = typedSales.slice(-14 * typedItems.length);
    const wasteMap = new Map<string, number>();
    for (const r of last14) {
      const existing = wasteMap.get(r.date) ?? 0;
      wasteMap.set(r.date, existing + r.quantity_wasted);
    }
    const wasteData = [...wasteMap.entries()]
      .map(([date, waste]) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        waste,
      }))
      .slice(-14);

    setData({
      todayPrediction,
      totalSoldToday,
      estimatedWaste,
      mostDemanded,
      lowDemand,
      upcomingHighDemandDay,
      weeklyData,
      monthlyData,
      wasteData,
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!data) return <div className="text-center text-slate-500 py-20">No data available</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
        <p className="text-slate-500 mt-1">Real-time canteen demand insights and analytics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Predicted Demand Today"
          value={`${data.todayPrediction}`}
          subtitle="units expected to sell"
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Total Sold Today"
          value={`${data.totalSoldToday}`}
          subtitle="units sold"
          icon={ShoppingBag}
          color="emerald"
        />
        <StatCard
          title="Estimated Waste"
          value={`${data.estimatedWaste}`}
          subtitle="units wasted"
          icon={Trash2}
          color="rose"
        />
        <StatCard
          title="Most Demanded"
          value={data.mostDemanded?.name ?? 'N/A'}
          subtitle={`${data.mostDemanded?.sold ?? 0} units sold`}
          icon={Trophy}
          color="blue"
        />
        <StatCard
          title="Low Demand"
          value={data.lowDemand?.name ?? 'N/A'}
          subtitle={`${data.lowDemand?.sold ?? 0} units sold`}
          icon={TrendingDown}
          color="slate"
        />
        <StatCard
          title="Upcoming High Demand"
          value={data.upcomingHighDemandDay?.day ?? 'N/A'}
          subtitle={data.upcomingHighDemandDay?.reason ?? ''}
          icon={CalendarClock}
          color="violet"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Weekly Demand" subtitle="Sold vs Prepared by day">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.weeklyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="prepared" fill="#cbd5e1" name="Prepared" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sold" fill="#f59e0b" name="Sold" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Sales" subtitle="Total units sold per week">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.monthlyData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#salesGradient)"
                name="Units Sold"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Food Waste Trend" subtitle="Daily waste over last 14 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.wasteData}>
              <defs>
                <linearGradient id="wasteGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="waste"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ fill: '#f43f5e', r: 4 }}
                activeDot={{ r: 6 }}
                name="Units Wasted"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  rose: 'bg-rose-50 text-rose-600 border-rose-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  violet: 'bg-violet-50 text-violet-600 border-violet-200',
};

const ICON_BG_MAP: Record<string, string> = {
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  blue: 'bg-blue-500',
  slate: 'bg-slate-500',
  violet: 'bg-violet-500',
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Package;
  color: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 border ${COLOR_MAP[color]} shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1 truncate">{value}</p>
          <p className="text-sm text-slate-500 mt-1 truncate">{subtitle}</p>
        </div>
        <div className={`w-11 h-11 ${ICON_BG_MAP[color]} rounded-xl flex items-center justify-center shrink-0 ml-3`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
