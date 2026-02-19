import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, X } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type OrderStage = Database['public']['Tables']['order_stages']['Row'];

interface OrderWithDetails extends Order {
  client?: Client;
  stage?: OrderStage;
}

interface OrdersTableProps {
  onOrderClick: (order: OrderWithDetails) => void;
}

export default function OrdersTable({ onOrderClick }: OrdersTableProps) {
  const { currentLocation } = useLocation();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [stages, setStages] = useState<OrderStage[]>([]);

  useEffect(() => {
    loadData();
  }, [currentLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  async function loadData() {
    try {
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          stage:order_stages(*)
        `)
        .order('created_at', { ascending: false });

      if (currentLocation?.id) {
        ordersQuery = ordersQuery.or(`location_id.eq.${currentLocation.id},location_id.is.null`);
      }

      const [ordersRes, stagesRes] = await Promise.all([
        ordersQuery,
        supabase.from('order_stages').select('*').order('position')
      ]);

      if (ordersRes.error) {
        console.error('Error loading orders:', ordersRes.error);
      } else if (ordersRes.data) {
        setOrders(ordersRes.data as OrderWithDetails[]);
      }

      if (stagesRes.data) setStages(stagesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(query) ||
        order.client?.full_name?.toLowerCase().includes(query) ||
        order.device_model?.toLowerCase().includes(query) ||
        order.issue_description?.toLowerCase().includes(query)
      );
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(order =>
        order.stage?.id && selectedStatuses.includes(order.stage.id)
      );
    }

    return filtered;
  }, [orders, searchQuery, selectedStatuses]);

  function toggleStatusFilter(stageId: string) {
    setSelectedStatuses(prev =>
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  }

  function clearFilters() {
    setSelectedStatuses([]);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  }

  function getStatusBadge(stage?: OrderStage) {
    if (!stage) return <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-600">Без статуса</span>;

    return (
      <span
        className="px-2 py-1 text-xs rounded-full font-medium"
        style={{
          backgroundColor: `${stage.color}20`,
          color: stage.color
        }}
      >
        {stage.name}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-neutral-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по номеру заказа, клиенту, модели, описанию..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                selectedStatuses.length > 0
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Фильтры
              {selectedStatuses.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                  {selectedStatuses.length}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-neutral-900">Фильтр по статусу</h3>
                    {selectedStatuses.length > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Очистить
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {stages.map((stage) => (
                      <label
                        key={stage.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(stage.id)}
                          onChange={() => toggleStatusFilter(stage.id)}
                          className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span
                          className="px-2 py-1 text-xs rounded-full font-medium"
                          style={{
                            backgroundColor: `${stage.color}20`,
                            color: stage.color
                          }}
                        >
                          {stage.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Номер заказа
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Дата создания
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Клиент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Модель устройства
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Описание проблемы
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Сумма
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                  {searchQuery || selectedStatuses.length > 0
                    ? 'Заказы не найдены'
                    : 'Нет заказов'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => onOrderClick(order)}
                  className="hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">
                      {order.order_number || `#${order.id.slice(0, 8)}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900">
                      {formatDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-900">
                      {order.client?.full_name || 'Без клиента'}
                    </div>
                    {order.client?.phone && (
                      <div className="text-xs text-neutral-500">{order.client.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900">
                      {order.device_type}
                    </div>
                    {order.device_model && (
                      <div className="text-xs text-neutral-500">{order.device_model}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-neutral-900 max-w-xs truncate">
                      {order.issue_description}
                    </div>
                    {order.waiting_for_parts && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          ⏳ Gaida detaļu
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.stage)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-neutral-900">
                      {formatCurrency(
                        order.final_cost ||
                        (order.subtotal ? order.subtotal - (order.total_discount || 0) : order.estimated_cost)
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border-t border-neutral-200 px-6 py-4">
        <div className="text-sm text-neutral-600">
          Всего заказов: <span className="font-semibold">{filteredOrders.length}</span>
          {filteredOrders.length !== orders.length && (
            <span className="text-neutral-400"> из {orders.length}</span>
          )}
        </div>
      </div>
    </div>
  );
}
