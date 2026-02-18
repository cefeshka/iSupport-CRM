import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Calendar, User, Package, AlertCircle, DollarSign, ChevronDown } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type OrderStage = Database['public']['Tables']['order_stages']['Row'];

interface OrderWithDetails extends Order {
  client?: Client;
  stage?: OrderStage;
}

interface OrdersKanbanProps {
  onOrderClick: (order: OrderWithDetails) => void;
}

export default function OrdersKanban({ onOrderClick }: OrdersKanbanProps) {
  const { currentLocation } = useLocation();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [stages, setStages] = useState<OrderStage[]>([]);

  useEffect(() => {
    if (currentLocation) {
      loadData();
    }
  }, [currentLocation]);

  useEffect(() => {
    applyFilters();
  }, [orders, searchQuery, dateFrom, dateTo, selectedStage, minAmount, maxAmount]);

  async function loadData() {
    if (!currentLocation) return;

    const [ordersRes, stagesRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          stage:order_stages(*)
        `)
        .eq('location_id', currentLocation.id)
        .order('created_at', { ascending: false }),
      supabase.from('order_stages').select('*').order('position')
    ]);

    if (ordersRes.data) setOrders(ordersRes.data as OrderWithDetails[]);
    if (stagesRes.data) setStages(stagesRes.data);
    setLoading(false);
  }

  function applyFilters() {
    let filtered = [...orders];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(query) ||
        order.client?.full_name?.toLowerCase().includes(query) ||
        order.device_type?.toLowerCase().includes(query) ||
        order.device_model?.toLowerCase().includes(query) ||
        order.issue_description?.toLowerCase().includes(query)
      );
    }

    if (dateFrom) {
      filtered = filtered.filter(order =>
        new Date(order.created_at) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order =>
        new Date(order.created_at) <= endDate
      );
    }

    if (selectedStage) {
      filtered = filtered.filter(order => order.stage_id === selectedStage);
    }

    if (minAmount) {
      filtered = filtered.filter(order => {
        const amount = order.final_cost || order.estimated_cost || 0;
        return amount >= parseFloat(minAmount);
      });
    }

    if (maxAmount) {
      filtered = filtered.filter(order => {
        const amount = order.final_cost || order.estimated_cost || 0;
        return amount <= parseFloat(maxAmount);
      });
    }

    setFilteredOrders(filtered);
  }

  function clearFilters() {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setSelectedStage('');
    setMinAmount('');
    setMaxAmount('');
  }

  const getStageColor = (color: string | null) => {
    const colors: Record<string, string> = {
      blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-300',
      yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-300',
      orange: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-orange-300',
      purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 border-purple-300',
      green: 'bg-gradient-to-br from-green-50 to-emerald-100 text-green-700 border-green-300',
      gray: 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-gray-300'
    };
    return colors[color || 'gray'] || colors.gray;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-blue-600';
      default: return 'text-neutral-600';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Срочно';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      default: return 'Низкий';
    }
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || selectedStage || minAmount || maxAmount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-neutral-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 h-full overflow-auto">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-fuchsia-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по номеру, клиенту, устройству, неисправности..."
              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-fuchsia-500 focus:shadow-lg focus:shadow-fuchsia-100 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-5 py-3 rounded-xl flex items-center gap-2 font-medium transition-all ${
              hasActiveFilters
                ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-200'
                : 'bg-white border-2 border-neutral-200 hover:border-fuchsia-300 hover:shadow-md'
            }`}
          >
            <Filter className="w-5 h-5" />
            Фильтры
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-white text-fuchsia-600 text-xs font-bold rounded-full">
                {[searchQuery, dateFrom, dateTo, selectedStage, minAmount, maxAmount].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="p-6 bg-gradient-to-br from-white to-neutral-50 border-2 border-neutral-200 rounded-xl space-y-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2 uppercase tracking-wide">
                  Дата создания от
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-neutral-200 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:shadow-md transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2 uppercase tracking-wide">
                  Дата создания до
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-neutral-200 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:shadow-md transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2 uppercase tracking-wide">
                  Статус
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-neutral-200 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:shadow-md transition-all"
                >
                  <option value="">Все статусы</option>
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2 uppercase tracking-wide">
                  Сумма от
                </label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-white border-2 border-neutral-200 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:shadow-md transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2 uppercase tracking-wide">
                  Сумма до
                </label>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-white border-2 border-neutral-200 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:shadow-md transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-all"
              >
                Очистить фильтры
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neutral-50 to-neutral-100 border border-neutral-200 rounded-lg">
          <Package className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700">
            Найдено заказов:
          </span>
          <span className="text-sm font-bold text-neutral-900">
            {filteredOrders.length}
          </span>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-neutral-100 to-neutral-50 rounded-2xl mb-4">
            <Package className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-500 text-lg">Заказы не найдены</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const isClosed = order.stage?.name === 'Закрыт';
            const amount = order.final_cost || order.estimated_cost || 0;

            return (
              <div
                key={order.id}
                onClick={() => onOrderClick(order)}
                className="group bg-white border border-neutral-200 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-fuchsia-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="px-2 py-1 bg-gradient-to-br from-fuchsia-50 to-pink-50 border border-fuchsia-200 rounded-md group-hover:shadow-md group-hover:shadow-fuchsia-100 transition-all duration-200">
                      <div className="text-[9px] font-medium text-fuchsia-600 mb-0.5 uppercase tracking-wide">Заказ</div>
                      <div className="font-mono text-xs font-bold text-fuchsia-700">
                        {order.order_number}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <div className="text-[10px] font-medium text-neutral-500 mb-0.5 uppercase tracking-wide">Дата</div>
                      <div className="flex items-center gap-1 text-xs text-neutral-900">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        {new Date(order.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium text-neutral-500 mb-0.5 uppercase tracking-wide">Клиент</div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-2.5 h-2.5 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-neutral-900 truncate">
                          {order.client?.full_name}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium text-neutral-500 mb-0.5 uppercase tracking-wide">Устройство</div>
                      <div className="text-xs">
                        <div className="font-semibold text-neutral-900">{order.device_type}</div>
                        {order.device_model && (
                          <div className="text-[10px] text-neutral-500 mt-0.5">{order.device_model}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium text-neutral-500 mb-0.5 uppercase tracking-wide">Проблема</div>
                      <div className="text-xs text-neutral-700 line-clamp-2">
                        {order.issue_description}
                      </div>
                      {order.waiting_for_parts && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            ⏳ Gaida detaļu
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-1.5">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-semibold rounded-md border transition-all ${getStageColor(order.stage?.color || null)}`}>
                        {order.stage?.name}
                      </span>
                      {isClosed ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-md">
                          <DollarSign className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-bold text-green-700">
                            {amount.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-400 px-2 py-1">Не завершен</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
