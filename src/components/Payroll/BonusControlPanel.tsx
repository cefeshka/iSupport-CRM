import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';

interface TechnicianBonus {
  technician_id: string;
  technician_name: string;
  total_labor: number;
  bonus_amount: number;
  status: string;
  quota_progress: number;
}

export function BonusControlPanel() {
  const { currentLocation } = useLocation();
  const [bonuses, setBonuses] = useState<TechnicianBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadBonuses();
  }, [selectedMonth, currentLocation]);

  const loadBonuses = async () => {
    setLoading(true);
    try {
      const targetDate = `${selectedMonth}-01`;
      const locationId = currentLocation?.id ? Number(currentLocation.id) : null;

      const { data, error } = await supabase.rpc('get_technician_bonuses', {
        target_month: targetDate,
        target_location_id: locationId
      });

      if (error) throw error;
      setBonuses(data || []);
    } catch (error) {
      console.error('Error loading bonuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalBonuses = bonuses.reduce((sum, b) => sum + b.bonus_amount, 0);
  const totalLabor = bonuses.reduce((sum, b) => sum + b.total_labor, 0);
  const techniciansOverQuota = bonuses.filter(b => b.status === 'Quota Reached').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Quota Reached': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Active': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatMonthYear = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-full overflow-auto bg-neutral-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Bonus Control Panel</h1>
              <p className="text-sm text-neutral-600 mt-1">
                Track technician performance and calculate monthly bonuses
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">
                    Total Bonuses
                  </p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {formatCurrency(totalBonuses)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">
                    Total Labor Revenue
                  </p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {formatCurrency(totalLabor)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">
                    Quota Reached
                  </p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {techniciansOverQuota} / {bonuses.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">
                    Period
                  </p>
                  <p className="text-lg font-bold text-neutral-900">
                    {formatMonthYear(selectedMonth)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Technician Bonuses</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Quota: €6,000 | Bonus Rate: 25% of revenue above quota
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-neutral-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-sm text-neutral-500 mt-3">Loading bonus data...</p>
            </div>
          ) : bonuses.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-600 font-medium">No technician data found</p>
              <p className="text-sm text-neutral-500 mt-1">
                No technicians have labor revenue for {formatMonthYear(selectedMonth)}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Technician
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Total Labor
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Progress to Quota
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Bonus
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {bonuses.map((bonus) => (
                    <tr key={bonus.technician_id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {bonus.technician_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">{bonus.technician_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-neutral-900">
                          {formatCurrency(bonus.total_labor)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(bonus.quota_progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-neutral-700 min-w-[3rem] text-right">
                            {bonus.quota_progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${bonus.bonus_amount > 0 ? 'text-emerald-600' : 'text-neutral-400'}`}>
                          {formatCurrency(bonus.bonus_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(bonus.status)}`}>
                            {bonus.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">How Bonuses Work</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-neutral-700">
            <div>
              <p className="font-medium text-neutral-900 mb-1">Monthly Quota</p>
              <p>Technicians must exceed €6,000 in labor revenue to earn bonuses.</p>
            </div>
            <div>
              <p className="font-medium text-neutral-900 mb-1">Bonus Calculation</p>
              <p>Earn 25% of all revenue above the €6,000 quota threshold.</p>
            </div>
            <div>
              <p className="font-medium text-neutral-900 mb-1">Example</p>
              <p>€8,000 labor = €500 bonus ((8000 - 6000) × 0.25)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
