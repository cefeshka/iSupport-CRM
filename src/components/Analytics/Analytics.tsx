import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Clock,
  Award,
  Target,
  Calendar
} from 'lucide-react';
import { SupplierExpenseAnalytics } from './SupplierExpenseAnalytics';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface KPIMetrics {
  revenue: number;
  netProfit: number;
  averageTicket: number;
  ordersCount: number;
  partsRevenue: number;
  serviceRevenue: number;
  totalCommissions: number;
}

interface LeadSourceData {
  source: string;
  revenue: number;
  orders: number;
  profit: number;
}

interface MasterPerformance {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  profit: number;
  avgTime: number;
  commission: number;
}

interface InventoryAnalytics {
  topParts: Array<{ name: string; usage: number }>;
  frozenCapital: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  profit: number;
}

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

const LEAD_SOURCE_COLORS = {
  'Google': '#4285F4',
  'TikTok': '#000000',
  'Instagram': '#E4405F',
  'Recommendation': '#34C759',
  'Walk-in': '#8E8E93',
  'Other': '#FF9500'
};

export default function Analytics() {
  const { currentLocation } = useLocation();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics>({
    revenue: 0,
    netProfit: 0,
    averageTicket: 0,
    ordersCount: 0,
    partsRevenue: 0,
    serviceRevenue: 0,
    totalCommissions: 0
  });

  const [leadSources, setLeadSources] = useState<LeadSourceData[]>([]);
  const [masterPerformance, setMasterPerformance] = useState<MasterPerformance[]>([]);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics>({
    topParts: [],
    frozenCapital: 0
  });
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);

  useEffect(() => {
    if (currentLocation) {
      loadAnalytics();
    }
  }, [currentLocation, dateFilter, customDateFrom, customDateTo]);

  function getDateRange(): { from: Date; to: Date } {
    const now = new Date();
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    let from = new Date();

    switch (dateFilter) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        from.setHours(0, 0, 0, 0);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        from.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (customDateFrom) from = new Date(customDateFrom);
        if (customDateTo) to.setTime(new Date(customDateTo).getTime());
        break;
    }

    return { from, to };
  }

  async function loadAnalytics() {
    if (!currentLocation) return;

    setLoading(true);
    const { from, to } = getDateRange();

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          master:profiles!orders_master_id_fkey(id, full_name),
          stage:order_stages(name)
        `)
        .eq('location_id', currentLocation.id)
        .gte('completed_at', from.toISOString())
        .lte('completed_at', to.toISOString())
        .not('completed_at', 'is', null);

      if (ordersError) throw ordersError;

      const orders = ordersData || [];
      const closedOrders = orders.filter((o: any) => o.stage?.name === 'Закрыт');

      calculateKPIMetrics(closedOrders);
      calculateLeadSources(closedOrders);
      calculateMasterPerformance(closedOrders);
      calculateDailyRevenue(closedOrders);
      await calculateInventoryAnalytics();

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateKPIMetrics(orders: any[]) {
    const revenue = orders.reduce((sum, o) => sum + (o.final_cost || 0), 0);
    const grossProfit = orders.reduce((sum, o) => sum + (o.total_profit || 0), 0);
    const commissions = orders.reduce((sum, o) => sum + (o.master_commission || 0), 0);
    const netProfit = grossProfit - commissions;
    const averageTicket = orders.length > 0 ? revenue / orders.length : 0;

    const serviceRevenue = orders.reduce((sum, o) => sum + (o.service_price || 0), 0);
    const partsCost = orders.reduce((sum, o) => sum + (o.parts_cost_total || 0), 0);
    const partsRevenue = revenue - serviceRevenue;

    setKpiMetrics({
      revenue: Math.round(revenue * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      averageTicket: Math.round(averageTicket * 100) / 100,
      ordersCount: orders.length,
      partsRevenue: Math.round(partsRevenue * 100) / 100,
      serviceRevenue: Math.round(serviceRevenue * 100) / 100,
      totalCommissions: Math.round(commissions * 100) / 100
    });
  }

  function calculateLeadSources(orders: any[]) {
    const sourcesMap = new Map<string, { revenue: number; orders: number; profit: number }>();

    orders.forEach((order: any) => {
      const source = order.lead_source || 'Walk-in';
      const existing = sourcesMap.get(source) || { revenue: 0, orders: 0, profit: 0 };

      const orderRevenue = order.final_cost || 0;
      const orderProfit = order.total_profit || 0;

      sourcesMap.set(source, {
        revenue: existing.revenue + orderRevenue,
        orders: existing.orders + 1,
        profit: existing.profit + orderProfit
      });
    });

    const sources = Array.from(sourcesMap.entries()).map(([source, data]) => ({
      source,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders,
      profit: Math.round(data.profit * 100) / 100
    })).sort((a, b) => b.revenue - a.revenue);

    setLeadSources(sources);
  }

  function calculateMasterPerformance(orders: any[]) {
    const mastersMap = new Map<string, {
      name: string;
      orders: number;
      revenue: number;
      profit: number;
      totalTime: number;
      commission: number;
    }>();

    orders.forEach((order: any) => {
      if (!order.master) return;

      const masterId = order.master.id;
      const existing = mastersMap.get(masterId) || {
        name: order.master.full_name,
        orders: 0,
        revenue: 0,
        profit: 0,
        totalTime: 0,
        commission: 0
      };

      const orderRevenue = order.final_cost || 0;
      const orderProfit = order.total_profit || 0;
      const orderTime = order.completed_at && order.accepted_at
        ? (new Date(order.completed_at).getTime() - new Date(order.accepted_at).getTime()) / (1000 * 60 * 60)
        : 0;

      mastersMap.set(masterId, {
        name: existing.name,
        orders: existing.orders + 1,
        revenue: existing.revenue + orderRevenue,
        profit: existing.profit + orderProfit,
        totalTime: existing.totalTime + orderTime,
        commission: existing.commission + (order.master_commission || 0)
      });
    });

    const masters = Array.from(mastersMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      orders: data.orders,
      revenue: Math.round(data.revenue * 100) / 100,
      profit: Math.round(data.profit * 100) / 100,
      commission: Math.round(data.commission * 100) / 100,
      avgTime: Math.round((data.orders > 0 ? data.totalTime / data.orders : 0) * 100) / 100
    })).sort((a, b) => b.profit - a.profit);

    setMasterPerformance(masters);
  }

  function calculateDailyRevenue(orders: any[]) {
    const dailyMap = new Map<string, { revenue: number; profit: number }>();

    orders.forEach((order: any) => {
      const date = new Date(order.completed_at).toLocaleDateString('ru-RU');
      const existing = dailyMap.get(date) || { revenue: 0, profit: 0 };

      const orderRevenue = order.final_cost || 0;
      const orderProfit = orderRevenue - (order.parts_cost_total || 0) - (order.master_commission || 0);

      dailyMap.set(date, {
        revenue: existing.revenue + orderRevenue,
        profit: existing.profit + orderProfit
      });
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date.split('.').reverse().join('-')).getTime() - new Date(b.date.split('.').reverse().join('-')).getTime());

    setDailyRevenue(daily);
  }

  async function calculateInventoryAnalytics() {
    if (!currentLocation) return;

    const { data: inventoryData } = await supabase
      .from('inventory')
      .select('*, movements:inventory_movements(quantity, movement_type)')
      .eq('location_id', currentLocation.id);

    if (!inventoryData) return;

    const frozenCapital = inventoryData.reduce((sum, item) =>
      sum + (item.quantity * item.unit_cost), 0
    );

    const partsUsage = new Map<string, number>();
    inventoryData.forEach((item: any) => {
      if (item.movements) {
        const totalUsed = item.movements
          .filter((m: any) => m.movement_type === 'outcome')
          .reduce((sum: number, m: any) => sum + Math.abs(m.quantity), 0);

        if (totalUsed > 0) {
          partsUsage.set(item.part_name, totalUsed);
        }
      }
    });

    const topParts = Array.from(partsUsage.entries())
      .map(([name, usage]) => ({ name, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    setInventoryAnalytics({ topParts, frozenCapital });
  }

  const dateFilters: Array<{ id: DateFilter; label: string }> = [
    { id: 'today', label: 'Сегодня' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'year', label: 'Год' },
    { id: 'custom', label: 'Свой период' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-neutral-500">Загрузка аналитики...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-neutral-50">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Аналитика и Финансы</h1>
            <p className="text-sm text-neutral-600 mt-1">Глубокая аналитика бизнеса</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {dateFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setDateFilter(filter.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="bg-white rounded-lg p-4 border border-neutral-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <span className="text-neutral-500">—</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-neutral-900">€{kpiMetrics.revenue.toFixed(2)}</div>
            <div className="text-sm text-neutral-600 mt-1">Выручка</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-neutral-900">€{kpiMetrics.netProfit.toFixed(2)}</div>
            <div className="text-sm text-neutral-600 mt-1">Чистая прибыль</div>
            <div className="text-xs text-neutral-500 mt-2">
              {kpiMetrics.revenue > 0 ? ((kpiMetrics.netProfit / kpiMetrics.revenue) * 100).toFixed(1) : 0}% маржа
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900">€{kpiMetrics.averageTicket.toFixed(2)}</div>
            <div className="text-sm text-neutral-600 mt-1">Средний чек</div>
            <div className="text-xs text-neutral-500 mt-2">
              {kpiMetrics.ordersCount} заказов
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900">€{kpiMetrics.totalCommissions.toFixed(2)}</div>
            <div className="text-sm text-neutral-600 mt-1">Комиссии мастеров</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Динамика выручки</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                  formatter={(value: number) => `€${value.toFixed(2)}`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Выручка" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Прибыль" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">ROI Маркетинга</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.source}: €${entry.revenue.toFixed(0)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={LEAD_SOURCE_COLORS[entry.source as keyof typeof LEAD_SOURCE_COLORS] || LEAD_SOURCE_COLORS.Other} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Рейтинг мастеров</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-600">Мастер</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-neutral-600">Заказы</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-neutral-600">Прибыль</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-neutral-600">Ср. время</th>
                  </tr>
                </thead>
                <tbody>
                  {masterPerformance.map((master, index) => (
                    <tr key={master.id} className="border-t border-neutral-100">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-neutral-100 text-neutral-600'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-neutral-900">{master.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-neutral-700">{master.orders}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-green-600">
                        €{master.profit.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-neutral-700">
                        {master.avgTime.toFixed(1)}ч
                      </td>
                    </tr>
                  ))}
                  {masterPerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-neutral-500">
                        Нет данных за выбранный период
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Складская аналитика</h3>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-amber-600" />
                  <div>
                    <div className="text-sm text-amber-800 font-medium">Замороженный капитал</div>
                    <div className="text-2xl font-bold text-amber-900">
                      €{inventoryAnalytics.frozenCapital.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-neutral-700 mb-3">Топ-5 используемых запчастей</div>
                <div className="space-y-2">
                  {inventoryAnalytics.topParts.map((part, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg">
                      <span className="text-sm text-neutral-900">{part.name}</span>
                      <span className="text-sm font-semibold text-blue-600">{part.usage} шт.</span>
                    </div>
                  ))}
                  {inventoryAnalytics.topParts.length === 0 && (
                    <div className="text-sm text-neutral-500 text-center py-4">
                      Нет данных об использовании запчастей
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Детализация по источникам</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">Источник</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-neutral-600">Заказов</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">Выручка</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">Прибыль</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">Ср. чек</th>
                </tr>
              </thead>
              <tbody>
                {leadSources.map((source) => (
                  <tr key={source.source} className="border-t border-neutral-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: LEAD_SOURCE_COLORS[source.source as keyof typeof LEAD_SOURCE_COLORS] || LEAD_SOURCE_COLORS.Other }}
                        />
                        <span className="text-sm font-medium text-neutral-900">{source.source}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-neutral-700">{source.orders}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">
                      €{source.revenue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                      €{source.profit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-neutral-700">
                      €{(source.revenue / source.orders).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {leadSources.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                      Нет данных за выбранный период
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <SupplierExpenseAnalytics
          dateFilter={dateFilter}
          customDateFrom={customDateFrom}
          customDateTo={customDateTo}
        />
      </div>
    </div>
  );
}
