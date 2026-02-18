import { TrendingUp, TrendingDown, Package, CheckCircle2, ShoppingBag } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  subtitle?: string;
  trend?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function CompactStatsCard({ title, value, subtitle, trend, icon: Icon, color, bgColor }: StatsCardProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 ${bgColor} rounded-lg`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <h3 className="text-xs font-bold text-neutral-800">{title}</h3>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-neutral-900">{value}</div>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
            trend >= 0
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  stats: {
    devicesAccepted: number;
    devicesClosed: number;
    accessoriesSold: number;
    devicesProfit: number;
    accessoriesProfit: number;
    avgRepairTime?: number;
    topRepair?: string;
    topAccessory?: string;
    totalRevenue: number;
    yesterdayAccepted?: number;
    yesterdayClosed?: number;
  };
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const acceptedTrend = stats.yesterdayAccepted !== undefined && stats.yesterdayAccepted > 0
    ? Math.round(((stats.devicesAccepted - stats.yesterdayAccepted) / stats.yesterdayAccepted) * 100)
    : undefined;

  const closedTrend = stats.yesterdayClosed !== undefined && stats.yesterdayClosed > 0
    ? Math.round(((stats.devicesClosed - stats.yesterdayClosed) / stats.yesterdayClosed) * 100)
    : undefined;

  return (
    <>
      <CompactStatsCard
        title="Принято"
        value={stats.devicesAccepted}
        subtitle={`${stats.totalRevenue.toFixed(2)} €`}
        trend={acceptedTrend}
        icon={Package}
        color="text-blue-600"
        bgColor="bg-blue-50"
      />

      <CompactStatsCard
        title="Закрыто"
        value={stats.devicesClosed}
        subtitle={stats.avgRepairTime ? `${stats.avgRepairTime}ч` : 'Нет данных'}
        trend={closedTrend}
        icon={CheckCircle2}
        color="text-green-600"
        bgColor="bg-green-50"
      />

      <CompactStatsCard
        title="Склад"
        value={stats.accessoriesSold}
        subtitle={`${stats.accessoriesProfit.toFixed(2)} €`}
        icon={ShoppingBag}
        color="text-orange-600"
        bgColor="bg-orange-50"
      />
    </>
  );
}
