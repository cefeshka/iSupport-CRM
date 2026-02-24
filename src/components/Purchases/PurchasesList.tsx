import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Package, Truck, Calendar, AlertCircle, CheckCircle, Clock, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';
import NewPurchaseOrderModal from './NewPurchaseOrderModal';
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal';

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier?: Supplier;
  items_count?: number;
}

export default function PurchasesList() {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithDetails[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentLocation) {
      loadPurchaseOrders();
      loadSuppliers();
    }
  }, [currentLocation]);

  async function loadSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (!error && data) {
      setSuppliers(data);
    }
  }

  async function loadPurchaseOrders() {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          items:purchase_order_items(count)
        `)
        .eq('location_id', currentLocation.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithCount = data?.map(order => ({
        ...order,
        items_count: order.items?.[0]?.count || 0
      })) || [];

      setPurchaseOrders(ordersWithCount);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-700';
      case 'In Transit':
        return 'bg-blue-100 text-blue-700';
      case 'Pending':
        return 'bg-amber-100 text-amber-700';
      case 'Delayed':
        return 'bg-red-100 text-red-700';
      case 'Cancelled':
        return 'bg-neutral-100 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'In Transit':
        return <Truck className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      case 'Delayed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const filteredOrders = purchaseOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.tracking_number && order.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: purchaseOrders.length,
    Pending: purchaseOrders.filter(o => o.status === 'Pending').length,
    'In Transit': purchaseOrders.filter(o => o.status === 'In Transit').length,
    Delivered: purchaseOrders.filter(o => o.status === 'Delivered').length,
    Delayed: purchaseOrders.filter(o => o.status === 'Delayed').length,
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="glass-panel mx-6 mt-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Закупки</h1>
            <p className="text-sm text-slate-600 mt-2 font-medium">Управление заказами поставщикам</p>
          </div>
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Новый заказ
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по номеру заказа, поставщику или трек-номеру..."
              className="input-premium w-full pl-12"
            />
          </div>

          <div className="flex gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                    : 'bg-white/60 border border-slate-200 text-slate-700 hover:bg-white/80'
                }`}
              >
                {status === 'all' ? 'Все' : status} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-neutral-500">Загрузка...</div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <Package className="w-12 h-12 mb-3 text-neutral-400" />
            <p className="text-lg font-medium">Заказы не найдены</p>
            <p className="text-sm mt-1">Создайте первый заказ поставщику</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Номер заказа</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Поставщик</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Статус</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Перевозчик</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Трек-номер</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Ожид. дата</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-600">Товаров</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-600">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="border-b border-neutral-200 last:border-0 hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900">{order.order_number}</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {new Date(order.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-neutral-900">{order.supplier?.name || 'Не указан'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-neutral-900">{order.carrier || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-neutral-900">{order.tracking_number || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {order.expected_arrival_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          <span className="text-sm text-neutral-900">
                            {new Date(order.expected_arrival_date).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-neutral-900">{order.items_count}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-neutral-900">€{order.total_cost.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewOrderModal && (
        <NewPurchaseOrderModal
          suppliers={suppliers}
          onClose={() => setShowNewOrderModal(false)}
          onSuccess={() => {
            setShowNewOrderModal(false);
            loadPurchaseOrders();
          }}
        />
      )}

      {selectedOrder && (
        <PurchaseOrderDetailModal
          order={selectedOrder}
          suppliers={suppliers}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            loadPurchaseOrders();
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}
