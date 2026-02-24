import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Euro, CreditCard, Wallet, CircleDollarSign, TrendingUp, Package, UserCheck, Wrench, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import TaskManager from './TaskManager';
import ExpectedDeliveries from './ExpectedDeliveries';
import DashboardStats from './DashboardStats';
import TechnicianPerformance from './TechnicianPerformance';
import AnnouncementWidget from './AnnouncementWidget';
import AnnouncementAdminPanel from './AnnouncementAdminPanel';
import UrgentAnnouncementModal from './UrgentAnnouncementModal';
import type { Database } from '../../lib/database.types';
import { motion } from 'framer-motion';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

interface PaymentMethodStats {
  totalAmount: number;
  profit: number;
}

interface Stats {
  devicesAccepted: number;
  devicesClosed: number;
  accessoriesSold: number;
  devicesProfit: number;
  accessoriesProfit: number;
  tasksCount: number;
  totalRevenue: number;
  avgRepairTime?: number;
  topRepair?: string;
  topAccessory?: string;
  yesterdayAccepted?: number;
  yesterdayClosed?: number;
  paymentMethods: {
    bank: PaymentMethodStats;
    cash: PaymentMethodStats;
    bs_cash: PaymentMethodStats;
  };
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const { currentLocation } = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [urgentAnnouncement, setUrgentAnnouncement] = useState<any>(null);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [stats, setStats] = useState<Stats>({
    devicesAccepted: 0,
    devicesClosed: 0,
    accessoriesSold: 0,
    devicesProfit: 0,
    accessoriesProfit: 0,
    tasksCount: 0,
    totalRevenue: 0,
    avgRepairTime: undefined,
    topRepair: undefined,
    topAccessory: undefined,
    yesterdayAccepted: undefined,
    yesterdayClosed: undefined,
    paymentMethods: {
      bank: { totalAmount: 0, profit: 0 },
      cash: { totalAmount: 0, profit: 0 },
      bs_cash: { totalAmount: 0, profit: 0 }
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, profile, currentLocation]);

  function refreshPerformance() {
    setRefreshTrigger(prev => prev + 1);
  }

  async function loadDashboardData() {
    if (!profile || !currentLocation) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dayStartISO = dayStart.toISOString();
    const dayEndISO = dayEnd.toISOString();

    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const yesterdayStartISO = yesterdayStart.toISOString();
    const yesterdayEndISO = yesterdayEnd.toISOString();

    const today = new Date().toISOString().split('T')[0];

    const [ordersRes, stagesRes, todayTasksRes, incompleteTasksRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*, stage:order_stages(*)')
        .eq('location_id', currentLocation.id),
      supabase.from('order_stages').select('*'),
      supabase
        .from('tasks')
        .select('*')
        .eq('location_id', currentLocation.id)
        .eq('due_date', selectedDate)
        .order('is_completed')
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('*')
        .eq('location_id', currentLocation.id)
        .eq('is_completed', false)
        .lte('due_date', today)
        .order('due_date')
        .order('created_at', { ascending: false })
    ]);

    const orders = ordersRes.data || [];
    const stages = stagesRes.data || [];
    const closedStageId = stages.find(s => s.name === 'Закрыт')?.id;
    const todayTasks = todayTasksRes.data || [];
    const incompleteTasks = incompleteTasksRes.data || [];

    const allTasksMap = new Map();
    [...todayTasks, ...incompleteTasks].forEach(task => {
      allTasksMap.set(task.id, task);
    });
    const userTasks = Array.from(allTasksMap.values());

    const devicesAcceptedToday = orders.filter(
      (o: Order) => o.accepted_at >= dayStartISO && o.accepted_at <= dayEndISO
    );

    const devicesAcceptedYesterday = orders.filter(
      (o: Order) => o.accepted_at >= yesterdayStartISO && o.accepted_at <= yesterdayEndISO
    );

    const devicesClosedToday = orders.filter(
      (o: any) => o.stage_id === closedStageId && o.completed_at && o.completed_at >= dayStartISO && o.completed_at <= dayEndISO
    );

    const devicesClosedYesterday = orders.filter(
      (o: any) => o.stage_id === closedStageId && o.completed_at && o.completed_at >= yesterdayStartISO && o.completed_at <= yesterdayEndISO
    );

    const closedOrderIds = devicesClosedToday.map((o: Order) => o.id);

    let accessoriesCount = 0;
    let devicesProfit = 0;
    let accessoriesProfit = 0;
    let totalRevenue = 0;

    const paymentMethodStats = {
      bank: { totalAmount: 0, profit: 0 },
      cash: { totalAmount: 0, profit: 0 },
      bs_cash: { totalAmount: 0, profit: 0 }
    };

    devicesAcceptedToday.forEach((order: Order) => {
      totalRevenue += order.estimated_cost || 0;
    });

    let totalRepairHours = 0;
    const repairCounts: Record<string, number> = {};
    const accessoryCounts: Record<string, number> = {};

    if (closedOrderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', closedOrderIds);

      if (items) {
        items.forEach((item: OrderItem) => {
          if (item.item_type === 'accessory') {
            accessoriesCount += item.quantity || 0;
            accessoriesProfit += item.profit || 0;
            const itemName = item.name || 'Неизвестно';
            accessoryCounts[itemName] = (accessoryCounts[itemName] || 0) + (item.quantity || 0);
          } else if (item.item_type === 'service') {
            devicesProfit += item.profit || 0;
            const serviceName = item.name || 'Неизвестно';
            repairCounts[serviceName] = (repairCounts[serviceName] || 0) + 1;
          } else {
            devicesProfit += item.profit || 0;
          }
        });
      }

      devicesClosedToday.forEach((order: Order) => {
        const paymentMethod = order.payment_method as 'bank' | 'cash' | 'bs_cash' | null;
        if (paymentMethod && paymentMethodStats[paymentMethod]) {
          paymentMethodStats[paymentMethod].totalAmount += order.final_cost || 0;
          paymentMethodStats[paymentMethod].profit += order.total_profit || 0;
        }

        if (order.accepted_at && order.completed_at) {
          const acceptedTime = new Date(order.accepted_at).getTime();
          const completedTime = new Date(order.completed_at).getTime();
          const hoursSpent = (completedTime - acceptedTime) / (1000 * 60 * 60);
          totalRepairHours += hoursSpent;
        }
      });
    }

    const avgRepairTime = devicesClosedToday.length > 0
      ? Math.round(totalRepairHours / devicesClosedToday.length)
      : undefined;

    const topRepair = Object.keys(repairCounts).length > 0
      ? Object.entries(repairCounts).sort((a, b) => b[1] - a[1])[0][0]
      : undefined;

    const topAccessory = Object.keys(accessoryCounts).length > 0
      ? Object.entries(accessoryCounts).sort((a, b) => b[1] - a[1])[0][0]
      : undefined;

    setStats({
      devicesAccepted: devicesAcceptedToday.length,
      devicesClosed: devicesClosedToday.length,
      accessoriesSold: accessoriesCount,
      devicesProfit: Math.round(devicesProfit * 100) / 100,
      accessoriesProfit: Math.round(accessoriesProfit * 100) / 100,
      tasksCount: userTasks.filter((t: Task) => !t.is_completed).length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRepairTime,
      topRepair,
      topAccessory,
      yesterdayAccepted: devicesAcceptedYesterday.length,
      yesterdayClosed: devicesClosedYesterday.length,
      paymentMethods: {
        bank: {
          totalAmount: Math.round(paymentMethodStats.bank.totalAmount * 100) / 100,
          profit: Math.round(paymentMethodStats.bank.profit * 100) / 100
        },
        cash: {
          totalAmount: Math.round(paymentMethodStats.cash.totalAmount * 100) / 100,
          profit: Math.round(paymentMethodStats.cash.profit * 100) / 100
        },
        bs_cash: {
          totalAmount: Math.round(paymentMethodStats.bs_cash.totalAmount * 100) / 100,
          profit: Math.round(paymentMethodStats.bs_cash.profit * 100) / 100
        }
      }
    });

    setTasks(userTasks);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    );
  }

  const totalProfit = stats.devicesProfit + stats.accessoriesProfit;
  const totalCash = stats.paymentMethods.bank.totalAmount + stats.paymentMethods.cash.totalAmount + stats.paymentMethods.bs_cash.totalAmount;
  const totalCashProfit = stats.paymentMethods.bank.profit + stats.paymentMethods.cash.profit + stats.paymentMethods.bs_cash.profit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Рабочий стол
            </h1>
            <p className="text-slate-600 mt-1">Добро пожаловать, {profile?.full_name}</p>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-2 shadow-soft"
          >
            <Calendar className="w-5 h-5 text-primary-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none outline-none text-sm text-slate-900 font-medium bg-transparent"
            />
          </motion.div>
        </motion.div>

        <AnnouncementWidget
          onUrgentAnnouncement={(announcement) => {
            setUrgentAnnouncement(announcement);
            setShowUrgentModal(true);
          }}
        />

        {(isAdmin() || profile?.role === 'owner' || profile?.role === 'manager') && (
          <AnnouncementAdminPanel />
        )}

        <TechnicianPerformance refreshTrigger={refreshTrigger} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-2xl p-6 shadow-medium hover:shadow-large transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-glow">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900">{stats.devicesAccepted}</div>
                <div className="text-xs text-slate-500 mt-1">Принято</div>
              </div>
            </div>
            {stats.yesterdayAccepted !== undefined && (
              <div className="text-xs text-slate-600">
                Вчера: <span className="font-semibold">{stats.yesterdayAccepted}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-200/60 rounded-2xl p-6 shadow-medium hover:shadow-large transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900">{stats.devicesClosed}</div>
                <div className="text-xs text-slate-500 mt-1">Закрыто</div>
              </div>
            </div>
            {stats.yesterdayClosed !== undefined && (
              <div className="text-xs text-slate-600">
                Вчера: <span className="font-semibold">{stats.yesterdayClosed}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-white to-blue-50 border border-blue-200/60 rounded-2xl p-6 shadow-medium hover:shadow-large transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900">{stats.devicesProfit.toFixed(2)} €</div>
                <div className="text-xs text-slate-500 mt-1">Прибыль (услуги)</div>
              </div>
            </div>
            {stats.topRepair && (
              <div className="text-xs text-slate-600 truncate">
                Топ: <span className="font-semibold">{stats.topRepair}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-white to-amber-50 border border-amber-200/60 rounded-2xl p-6 shadow-medium hover:shadow-large transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900">{stats.accessoriesProfit.toFixed(2)} €</div>
                <div className="text-xs text-slate-500 mt-1">Прибыль (товары)</div>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              Продано: <span className="font-semibold">{stats.accessoriesSold} шт</span>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-1 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-2xl p-6 shadow-medium"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl">
                <Euro className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Кассы за день</h3>
            </div>

            <div className="space-y-3 mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Банк</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">{stats.paymentMethods.bank.totalAmount.toFixed(2)} €</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  Прибыль: {stats.paymentMethods.bank.profit.toFixed(2)} €
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500 rounded-lg">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Касса</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">{stats.paymentMethods.cash.totalAmount.toFixed(2)} €</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  Прибыль: {stats.paymentMethods.cash.profit.toFixed(2)} €
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-500 rounded-lg">
                      <CircleDollarSign className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">БС</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">{stats.paymentMethods.bs_cash.totalAmount.toFixed(2)} €</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  Прибыль: {stats.paymentMethods.bs_cash.profit.toFixed(2)} €
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800">Всего за день</span>
                  <div className="text-2xl font-extrabold text-slate-900">{totalCash.toFixed(2)} €</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                  <TrendingUp className="w-3 h-3" />
                  Общая прибыль: {totalCashProfit.toFixed(2)} €
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <ExpectedDeliveries />
            <TaskManager tasks={tasks} onRefresh={loadDashboardData} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-2xl p-6 shadow-soft"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-glow flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Сводка за {new Date(selectedDate).toLocaleDateString('ru-RU')}
              </h3>
              <p className="text-slate-700">
                Принято <span className="font-bold text-primary-600">{stats.devicesAccepted}</span> устройств,
                закрыто <span className="font-bold text-emerald-600">{stats.devicesClosed}</span>.
                Продано <span className="font-bold text-amber-600">{stats.accessoriesSold}</span> аксессуаров.
                Общая прибыль составила <span className="font-bold text-slate-900">{totalProfit.toFixed(2)} €</span>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {showUrgentModal && urgentAnnouncement && (
        <UrgentAnnouncementModal
          announcement={urgentAnnouncement}
          onAcknowledge={async () => {
            if (!profile?.id) return;

            await supabase.rpc('mark_announcement_read', {
              p_announcement_id: urgentAnnouncement.id,
              p_user_id: profile.id
            });

            setShowUrgentModal(false);
            setUrgentAnnouncement(null);
          }}
        />
      )}
    </div>
  );
}
