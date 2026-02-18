import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Package, CheckCircle, Edit2, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];
type InventoryItem = Database['public']['Tables']['inventory']['Row'];

interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier?: Supplier;
}

interface PurchaseOrderItemWithInventory extends PurchaseOrderItem {
  inventory?: InventoryItem;
}

interface PurchaseOrderDetailModalProps {
  order: PurchaseOrderWithDetails;
  suppliers: Supplier[];
  onClose: () => void;
  onUpdate: () => void;
}

const carriers = ['DHL', 'FedEx', 'UPS', 'USPS', 'DPD', 'TNT', 'Другой'];
const statuses = ['Pending', 'In Transit', 'Delivered', 'Delayed', 'Cancelled'];

export default function PurchaseOrderDetailModal({
  order,
  suppliers,
  onClose,
  onUpdate
}: PurchaseOrderDetailModalProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<PurchaseOrderItemWithInventory[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [carrier, setCarrier] = useState(order.carrier || '');
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(order.expected_arrival_date || '');
  const [notes, setNotes] = useState(order.notes || '');

  useEffect(() => {
    loadOrderItems();
  }, [order.id]);

  async function loadOrderItems() {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*, inventory(*)')
      .eq('purchase_order_id', order.id);

    if (!error && data) {
      setItems(data as PurchaseOrderItemWithInventory[]);
    }
  }

  async function handleSave() {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status,
          tracking_number: trackingNumber || null,
          carrier: carrier || null,
          expected_arrival_date: expectedArrivalDate || null,
          notes: notes || null
        })
        .eq('id', order.id);

      if (error) throw error;

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating purchase order:', error);
      alert('Ошибка при обновлении заказа');
    } finally {
      setSaving(false);
    }
  }

  async function handleReceiveAllItems() {
    if (!profile) return;

    const confirmReceive = confirm(
      `Вы уверены, что хотите принять все товары по заказу ${order.order_number}?\n\n` +
      `Это действие обновит остатки на складе и изменит статус заказа на "Delivered".`
    );

    if (!confirmReceive) return;

    setReceiving(true);
    try {
      for (const item of items) {
        const quantityToReceive = item.quantity_ordered - item.quantity_received;

        if (quantityToReceive > 0 && item.inventory) {
          const { error: inventoryError } = await supabase
            .from('inventory')
            .update({
              quantity: item.inventory.quantity + quantityToReceive
            })
            .eq('id', item.inventory_id);

          if (inventoryError) throw inventoryError;

          const { error: itemError } = await supabase
            .from('purchase_order_items')
            .update({
              quantity_received: item.quantity_ordered
            })
            .eq('id', item.id);

          if (itemError) throw itemError;

          await supabase.from('inventory_movements').insert({
            inventory_id: item.inventory_id,
            movement_type: 'incoming',
            quantity: quantityToReceive,
            reference_type: 'purchase_order',
            reference_number: order.order_number,
            notes: `Прием товара по заказу ${order.order_number}`,
            user_id: profile.id
          });
        }
      }

      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Delivered',
          actual_arrival_date: new Date().toISOString().split('T')[0],
          received_by: profile.id
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      alert('Все товары успешно приняты на склад!');
      onUpdate();
    } catch (error) {
      console.error('Error receiving items:', error);
      alert('Ошибка при приеме товаров');
    } finally {
      setReceiving(false);
    }
  }

  const canReceiveItems = order.status !== 'Delivered' && order.status !== 'Cancelled';
  const hasUnreceivedItems = items.some(item => item.quantity_received < item.quantity_ordered);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">{order.order_number}</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Создан {new Date(order.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing && canReceiveItems && hasUnreceivedItems && (
              <button
                onClick={handleReceiveAllItems}
                disabled={receiving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {receiving ? 'Прием товара...' : 'Принять все товары'}
              </button>
            )}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Редактировать
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Поставщик
              </label>
              <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                {order.supplier?.name || 'Не указан'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Статус
              </label>
              {isEditing ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                  {order.status}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Перевозчик
              </label>
              {isEditing ? (
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите перевозчика</option>
                  {carriers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                  {order.carrier || '—'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Трек-номер
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Введите трек-номер"
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                  {order.tracking_number || '—'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Ожидаемая дата прибытия
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={expectedArrivalDate}
                  onChange={(e) => setExpectedArrivalDate(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                  {order.expected_arrival_date
                    ? new Date(order.expected_arrival_date).toLocaleDateString('ru-RU')
                    : '—'}
                </div>
              )}
            </div>

            {order.actual_arrival_date && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Фактическая дата прибытия
                </label>
                <div className="px-4 py-2 bg-green-50 rounded-lg text-green-900">
                  {new Date(order.actual_arrival_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Примечания
            </label>
            {isEditing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Дополнительная информация..."
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            ) : (
              <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900 min-h-[80px]">
                {order.notes || '—'}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Товары в заказе</h3>
            <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">Товар</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-neutral-600">Заказано</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-neutral-600">Получено</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">Цена/ед</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-neutral-200 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-neutral-400" />
                          <div>
                            <div className="text-sm font-medium text-neutral-900">
                              {item.inventory?.part_name}
                            </div>
                            <div className="text-xs text-neutral-500">
                              SKU: {item.inventory?.sku || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-neutral-900">{item.quantity_ordered}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-medium ${
                            item.quantity_received >= item.quantity_ordered
                              ? 'text-green-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {item.quantity_received}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-neutral-900">€{item.unit_cost.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-neutral-900">
                          €{item.total_cost.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-50 border-t border-neutral-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-neutral-700">
                      Итого:
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-semibold text-neutral-900">
                        €{order.total_cost.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
