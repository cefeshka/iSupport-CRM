import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Euro, CreditCard, Wallet, CircleDollarSign, TrendingUp } from 'lucide-react';
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
        <div className="text-neutral-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Рабочий стол</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Добро пожаловать, {profile?.full_name}</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-1.5">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none outline-none text-sm text-neutral-900 font-medium"
          />
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStats stats={stats} />

        <div className="relative bg-white border border-neutral-200 rounded-lg p-3">
          <div className="relative h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <Euro className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xs font-bold text-neutral-800">Кассы за день</h3>
            </div>

            <div className="space-y-2 mb-2 flex-1">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-blue-500 rounded-md">
                    <CreditCard className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-700">Банк</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-neutral-900">{stats.paymentMethods.bank.totalAmount.toFixed(2)} €</div>
                  <div className="flex items-center gap-0.5 text-[9px] text-green-600 font-medium">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {stats.paymentMethods.bank.profit.toFixed(2)} €
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-emerald-500 rounded-md">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-700">Касса</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-neutral-900">{stats.paymentMethods.cash.totalAmount.toFixed(2)} €</div>
                  <div className="flex items-center gap-0.5 text-[9px] text-green-600 font-medium">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {stats.paymentMethods.cash.profit.toFixed(2)} €
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-violet-500 rounded-md">
                    <CircleDollarSign className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-700">БС</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-neutral-900">{stats.paymentMethods.bs_cash.totalAmount.toFixed(2)} €</div>
                  <div className="flex items-center gap-0.5 text-[9px] text-green-600 font-medium">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {stats.paymentMethods.bs_cash.profit.toFixed(2)} €
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 mt-auto">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-50">
                <span className="text-[10px] font-bold text-neutral-800 flex items-center gap-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                  Всего
                </span>
                <div className="text-right">
                  <div className="text-base font-extrabold text-neutral-900">
                    {(stats.paymentMethods.bank.totalAmount + stats.paymentMethods.cash.totalAmount + stats.paymentMethods.bs_cash.totalAmount).toFixed(2)} €
                  </div>
                  <div className="text-[9px] text-green-600 font-bold flex items-center justify-end gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {(stats.paymentMethods.bank.profit + stats.paymentMethods.cash.profit + stats.paymentMethods.bs_cash.profit).toFixed(2)} €
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpectedDeliveries />
        <TaskManager tasks={tasks} onRefresh={loadDashboardData} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              Сводка за {new Date(selectedDate).toLocaleDateString('ru-RU')}
            </h3>
            <p className="text-xs text-blue-700 mt-0.5">
              Принято {stats.devicesAccepted} устройств, закрыто {stats.devicesClosed}.
              Продано {stats.accessoriesSold} аксессуаров.
              Общая прибыль составила {(stats.devicesProfit + stats.accessoriesProfit).toFixed(2)} €.
            </p>
          </div>
        </div>
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
