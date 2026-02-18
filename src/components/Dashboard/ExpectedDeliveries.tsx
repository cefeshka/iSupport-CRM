import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Truck, Calendar, Package, AlertCircle, Clock, Plus } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';
import PurchaseOrderDetailModal from '../Purchases/PurchaseOrderDetailModal';
import NewPurchaseOrderModal from '../Purchases/NewPurchaseOrderModal';

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier?: Supplier;
}

export default function ExpectedDeliveries() {
  const { currentLocation } = useLocation();
  const [orders, setOrders] = useState<PurchaseOrderWithDetails[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      loadData();
    }
  }, [currentLocation]);

  async function loadData() {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const [ordersRes, suppliersRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('*, supplier:suppliers(*)')
          .eq('location_id', currentLocation.id)
          .in('status', ['Pending', 'In Transit'])
          .order('expected_arrival_date', { ascending: true })
          .limit(10),
        supabase.from('suppliers').select('*')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
    } catch (error) {
      console.error('Error loading expected deliveries:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Transit':
        return 'bg-blue-100 text-blue-700';
      case 'Pending':
        return 'bg-amber-100 text-amber-700';
      case 'Delayed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Transit':
        return <Truck className="w-3.5 h-3.5" />;
      case 'Pending':
        return <Clock className="w-3.5 h-3.5" />;
      case 'Delayed':
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return <Package className="w-3.5 h-3.5" />;
    }
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Ожидаемые поставки</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Загрузка данных...</p>
          </div>
        </div>
        <div className="text-center py-8 text-neutral-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Ожидаемые поставки</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              {orders.length > 0 ? `${orders.length} ${orders.length === 1 ? 'заказ' : orders.length < 5 ? 'заказа' : 'заказов'} в пути` : 'Нет ожидаемых поставок'}
            </p>
          </div>
          {orders.length > 0 && (
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-10 h-10 text-neutral-400" />
            </div>
            <h4 className="text-base font-semibold text-neutral-900 mb-1">
              Все поставки получены
            </h4>
            <p className="text-sm text-neutral-500 mb-6">
              Можно работать!
            </p>
            <button
              onClick={() => setShowNewOrderModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Новая закупка
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full text-left p-3 bg-neutral-50 hover:bg-blue-50 rounded-lg border border-neutral-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-neutral-900">
                        {order.order_number}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                      <Package className="w-3 h-3" />
                      <span className="truncate">{order.supplier?.name || 'Поставщик не указан'}</span>
                    </div>

                    {order.carrier && (
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {order.carrier}
                        {order.tracking_number && ` • ${order.tracking_number}`}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    {order.expected_arrival_date ? (
                      <div>
                        <div className={`flex items-center gap-1 text-[11px] font-medium ${
                          isOverdue(order.expected_arrival_date)
                            ? 'text-red-600'
                            : 'text-neutral-700'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(order.expected_arrival_date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                        {isOverdue(order.expected_arrival_date) && (
                          <div className="text-[10px] text-red-600 mt-0.5 font-medium">Просрочено</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-400">—</div>
                    )}

                    <div className="text-[11px] text-neutral-900 font-medium mt-1">
                      €{order.total_cost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <PurchaseOrderDetailModal
          order={selectedOrder}
          suppliers={suppliers}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            loadData();
            setSelectedOrder(null);
          }}
        />
      )}

      {showNewOrderModal && (
        <NewPurchaseOrderModal
          onClose={() => setShowNewOrderModal(false)}
          onSuccess={() => {
            loadData();
            setShowNewOrderModal(false);
          }}
        />
      )}
    </>
  );
}
