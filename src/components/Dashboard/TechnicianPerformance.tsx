import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Target, Award, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { handleSupabaseError } from '../../lib/toast';

interface PerformanceData {
  totalLabor: number;
  quota: number;
  bonus: number;
  percentComplete: number;
  remaining: number;
  planReached: boolean;
}

interface TechnicianPerformanceProps {
  refreshTrigger?: number;
}

export default function TechnicianPerformance({ refreshTrigger }: TechnicianPerformanceProps) {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [performance, setPerformance] = useState<PerformanceData>({
    totalLabor: 0,
    quota: 6000,
    bonus: 0,
    percentComplete: 0,
    remaining: 6000,
    planReached: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, [profile, currentLocation, refreshTrigger]);

  // Set up real-time subscription for order updates
  useEffect(() => {
    if (!profile || profile.role !== 'technician' || !currentLocation) {
      return;
    }

    const channel = supabase
      .channel('technician_performance_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `assigned_to=eq.${profile.id}`,
        },
        () => {
          // Reload performance data when an assigned order is updated
          loadPerformanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, currentLocation]);

  async function loadPerformanceData() {
    if (!profile) {
      setLoading(false);
      return;
    }

    // Only show for technicians
    if (profile.role !== 'technician') {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_technician_performance', {
        target_month: new Date().toISOString()
      });

      if (error) {
        handleSupabaseError(error, 'Load performance data');
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        setPerformance({
          totalLabor: Number(result.total_labor_revenue) || 0,
          quota: Number(result.quota) || 6000,
          bonus: Number(result.bonus_amount) || 0,
          percentComplete: Number(result.percent_complete) || 0,
          remaining: Number(result.remaining_to_plan) || 0,
          planReached: result.plan_reached || false
        });
      }
    } catch (error: any) {
      handleSupabaseError(error, 'Load performance data');
    } finally {
      setLoading(false);
    }
  }

  // Don't render anything for non-technicians
  if (!profile || profile.role !== 'technician') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="text-sm text-neutral-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${performance.planReached ? 'from-green-50 to-emerald-50 border-green-300' : 'from-blue-50 to-cyan-50 border-blue-200'} border-2 rounded-xl p-4 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${performance.planReached ? 'bg-green-500' : 'bg-blue-500'} rounded-lg`}>
            {performance.planReached ? (
              <Award className="w-5 h-5 text-white" />
            ) : (
              <Target className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Моя мотивация</h3>
            <p className="text-xs text-neutral-600">
              {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-lg ${performance.planReached ? 'bg-green-100' : 'bg-blue-100'}`}>
          <span className={`text-xs font-bold ${performance.planReached ? 'text-green-700' : 'text-blue-700'}`}>
            {performance.percentComplete.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-end justify-between mb-1">
          <span className="text-xs font-medium text-neutral-600">Выполнено работ</span>
          <span className="text-2xl font-bold text-neutral-900">{performance.totalLabor.toFixed(2)}€</span>
        </div>
        <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${performance.planReached ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(100, performance.percentComplete)}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-neutral-500">0€</span>
          <span className="text-xs font-semibold text-neutral-700">{performance.quota}€</span>
        </div>
      </div>

      {!performance.planReached ? (
        <div className="space-y-2">
          <div className="bg-white/80 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-neutral-800">
                  До бонуса осталось: <span className="font-bold text-blue-600">{performance.remaining.toFixed(2)}€</span>
                </p>
                <p className="text-xs text-neutral-600 mt-1 italic">
                  Давай еще чуть и тебе будет начислятся бонус! 🚀
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-white/90 border-2 border-green-300 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-green-600" />
              <span className="text-sm font-bold text-green-800">План выполнен! ✅</span>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-3 text-center shadow-lg">
              <p className="text-xs text-green-50 font-medium mb-1">💰 Ваш бонус</p>
              <p className="text-3xl font-extrabold text-white drop-shadow-lg">{performance.bonus.toFixed(2)}€</p>
            </div>
            <p className="text-xs text-neutral-600 mt-2 text-center">
              Сумма сверх плана: {(performance.totalLabor - performance.quota).toFixed(2)}€ × 25%
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-neutral-200">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-neutral-500" />
          <p className="text-xs text-neutral-600">
            {performance.planReached
              ? 'Продолжай в том же духе! Каждая закрытая работа добавляет к твоему бонусу.'
              : `Осталось закрыть работ примерно на ${performance.remaining.toFixed(0)}€ до начисления бонусов.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
