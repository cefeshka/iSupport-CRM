import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, TrendingUp, Award, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { motion } from 'framer-motion';

interface BonusData {
  total_orders: number;
  completed_orders: number;
  total_profit: number;
  bonus_amount: number;
  month: string;
}

export default function TechnicianBonusWidget() {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [bonusData, setBonusData] = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBonusData();
  }, [profile?.id, currentLocation?.id]);

  async function loadBonusData() {
    if (!profile?.id || !currentLocation?.id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('calculate_technician_bonus', {
          p_user_id: profile.id,
          p_location_id: currentLocation.id,
          p_start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          p_end_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      if (data && data.length > 0) {
        setBonusData({
          total_orders: data[0].total_orders || 0,
          completed_orders: data[0].completed_orders || 0,
          total_profit: data[0].total_profit || 0,
          bonus_amount: data[0].bonus_amount || 0,
          month: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        });
      }
    } catch (error) {
      console.error('Error loading bonus data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-panel p-5 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
        <div className="h-8 bg-slate-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!bonusData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-green-600" />
          <h3 className="text-base font-bold text-slate-900">Мои бонусы</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/60 rounded-xl p-3 border border-slate-200/60">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-slate-500" />
              <p className="text-xs text-slate-600">Заказы</p>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {bonusData.completed_orders} / {bonusData.total_orders}
            </p>
          </div>

          <div className="bg-white/60 rounded-xl p-3 border border-slate-200/60">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <p className="text-xs text-slate-600">Прибыль</p>
            </div>
            <p className="text-xl font-bold text-slate-900">
              €{bonusData.total_profit.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90 mb-1">Премия за {bonusData.month}</p>
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                <p className="text-2xl font-bold">€{bonusData.bonus_amount.toFixed(2)}</p>
              </div>
            </div>
            <Award className="w-12 h-12 opacity-20" />
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Премия начисляется автоматически в конце месяца
        </p>
      </div>
    </motion.div>
  );
}
