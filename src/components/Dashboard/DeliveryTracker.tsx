import { useEffect, useState } from 'react';
import { Package, TruckIcon, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeliveryItem {
  id: string;
  item_name: string;
  quantity: number;
  cost_per_unit: number;
  notes?: string;
}

interface Delivery {
  id: string;
  expected_date: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed';
  tracking_number?: string;
  total_cost: number;
  notes?: string;
  supplier: {
    name: string;
    contact_person?: string;
  };
  items: DeliveryItem[];
}

const statusConfig = {
  pending: {
    label: 'Ожидается',
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  in_transit: {
    label: 'В пути',
    icon: TruckIcon,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  delivered: {
    label: 'Получено',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  delayed: {
    label: 'Задержка',
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
};

export function DeliveryTracker() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveries();
  }, []);

  async function loadDeliveries() {
    try {
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select(`
          id,
          expected_date,
          status,
          tracking_number,
          total_cost,
          notes,
          supplier:suppliers(name, contact_person)
        `)
        .in('status', ['pending', 'in_transit', 'delayed'])
        .order('expected_date', { ascending: true });

      if (deliveriesError) throw deliveriesError;

      if (!deliveriesData) {
        setDeliveries([]);
        return;
      }

      const deliveriesWithItems = await Promise.all(
        deliveriesData.map(async (delivery) => {
          const { data: items } = await supabase
            .from('delivery_items')
            .select('id, item_name, quantity, cost_per_unit, notes')
            .eq('delivery_id', delivery.id)
            .order('item_name');

          return {
            ...delivery,
            supplier: Array.isArray(delivery.supplier) ? delivery.supplier[0] : delivery.supplier,
            items: items || [],
          };
        })
      );

      setDeliveries(deliveriesWithItems);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  }

  function getDaysUntil(dateString: string): number {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('ru-RU', { month: 'short' });
    return `${day} ${month}`;
  }

  if (loading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-neutral-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-neutral-400" />
              </div>
            </div>
            <div className="text-sm text-neutral-500">Загрузка...</div>
          </div>
        ))}
      </>
    );
  }

  if (deliveries.length === 0) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-neutral-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-neutral-400" />
              </div>
            </div>
            <div className="text-sm text-neutral-500">Нет поставок</div>
          </div>
        ))}
      </>
    );
  }

  const displayedDeliveries = deliveries.slice(0, 3);

  return (
    <>
      {displayedDeliveries.map((delivery) => {
        const daysUntil = getDaysUntil(delivery.expected_date);
        const isUrgent = daysUntil >= 0 && daysUntil <= 2;
        const isOverdue = daysUntil < 0;
        const status = statusConfig[delivery.status];
        const StatusIcon = status.icon;

        return (
          <div key={delivery.id} className="bg-white rounded-lg border border-neutral-200 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 ${status.bg} rounded-lg flex items-center justify-center`}>
                <StatusIcon className={`w-4 h-4 ${status.color}`} />
              </div>
              <span className={`text-[10px] font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>

            <div className="text-base font-semibold text-neutral-900 mb-2">{delivery.supplier.name}</div>

            <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDate(delivery.expected_date)}
                  {isOverdue && (
                    <span className="ml-0.5 text-red-600 font-bold">
                      (-{Math.abs(daysUntil)}д.)
                    </span>
                  )}
                  {isUrgent && !isOverdue && (
                    <span className="ml-0.5 text-orange-600 font-bold">
                      ({daysUntil === 0 ? 'сегодня' : daysUntil === 1 ? 'завтра' : `${daysUntil}д.`})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {delivery.tracking_number && (
              <div className="text-[10px] text-neutral-400 mt-1 truncate">
                Трек: {delivery.tracking_number}
              </div>
            )}

            <div className="mt-2 space-y-1 max-h-[72px] overflow-y-auto">
              {delivery.items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-[10px] bg-neutral-50 rounded px-1.5 py-1"
                >
                  <span className="text-neutral-700 truncate flex-1 mr-1">{item.item_name}</span>
                  <span className="text-neutral-900 font-semibold flex-shrink-0">
                    {item.quantity} шт
                  </span>
                </div>
              ))}
              {delivery.items.length > 3 && (
                <div className="text-[10px] text-neutral-400 italic px-1.5">
                  +{delivery.items.length - 3} еще
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
