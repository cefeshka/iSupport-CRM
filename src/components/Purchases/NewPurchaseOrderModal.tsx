import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, Package, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type InventoryItem = Database['public']['Tables']['inventory']['Row'];

interface NewPurchaseOrderModalProps {
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderItem {
  inventory_id: string;
  inventory_item?: InventoryItem;
  quantity: number;
  unit_cost: number;
  notes: string;
}

const carriers = ['DHL', 'FedEx', 'UPS', 'USPS', 'DPD', 'TNT', 'Другой'];

export default function NewPurchaseOrderModal({ suppliers, onClose, onSuccess }: NewPurchaseOrderModalProps) {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [supplierId, setSupplierId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [expectedArrivalDate, setExpectedArrivalDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryResults, setInventoryResults] = useState<InventoryItem[]>([]);
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);

  useEffect(() => {
    if (inventorySearch.trim().length >= 2) {
      searchInventory(inventorySearch.trim());
    } else {
      setInventoryResults([]);
      setShowInventoryDropdown(false);
    }
  }, [inventorySearch]);

  async function searchInventory(query: string) {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .or(`part_name.ilike.%${query}%,sku.ilike.%${query}%`)
      .order('part_name')
      .limit(10);

    if (!error && data) {
      setInventoryResults(data);
      setShowInventoryDropdown(data.length > 0);
    }
  }

  function addInventoryItem(item: InventoryItem) {
    const existing = items.find(i => i.inventory_id === item.id);
    if (existing) {
      alert('Этот товар уже добавлен в заказ');
      return;
    }

    setItems([
      ...items,
      {
        inventory_id: item.id,
        inventory_item: item,
        quantity: 1,
        unit_cost: item.unit_cost,
        notes: ''
      }
    ]);

    setInventorySearch('');
    setShowInventoryDropdown(false);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OrderItem, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supplierId) {
      alert('Выберите поставщика');
      return;
    }

    if (items.length === 0) {
      alert('Добавьте хотя бы один товар');
      return;
    }

    if (!profile) return;

    setSaving(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          supplier_id: supplierId,
          order_number: '',
          tracking_number: trackingNumber || null,
          carrier: carrier || null,
          status: 'Pending',
          expected_arrival_date: expectedArrivalDate || null,
          notes: notes || null,
          created_by: profile.id,
          location_id: currentLocation?.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = items.map(item => ({
        purchase_order_id: orderData.id,
        inventory_id: item.inventory_id,
        quantity_ordered: item.quantity,
        unit_cost: item.unit_cost,
        notes: item.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      onSuccess();
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Ошибка при создании заказа');
    } finally {
      setSaving(false);
    }
  }

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
          <h2 className="text-xl font-semibold text-neutral-900">Новый заказ поставщику</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Поставщик *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите поставщика</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Ожидаемая дата прибытия
              </label>
              <input
                type="date"
                value={expectedArrivalDate}
                onChange={(e) => setExpectedArrivalDate(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Перевозчик
              </label>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Трек-номер
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Введите трек-номер"
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Примечания
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Дополнительная информация о заказе..."
              className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Товары *
            </label>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Найти товар для добавления..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {showInventoryDropdown && inventoryResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {inventoryResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addInventoryItem(item)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-neutral-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{item.part_name}</div>
                          <div className="text-xs text-neutral-500 mt-1">
                            SKU: {item.sku || '—'} | Себестоимость: €{item.unit_cost.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-xs text-neutral-500">
                          На складе: {item.quantity} шт
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200">
                <Package className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Добавьте товары в заказ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-900">
                        {item.inventory_item?.part_name}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        SKU: {item.inventory_item?.sku || '—'}
                      </div>
                    </div>

                    <div className="w-24">
                      <label className="block text-xs text-neutral-600 mb-1">Кол-во</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 border border-neutral-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="w-28">
                      <label className="block text-xs text-neutral-600 mb-1">Цена за ед.</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-neutral-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="w-24 text-right">
                      <div className="text-xs text-neutral-600 mb-1">Сумма</div>
                      <div className="text-sm font-medium text-neutral-900">
                        €{(item.quantity * item.unit_cost).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex justify-end pt-3 border-t border-neutral-200">
                  <div className="text-right">
                    <div className="text-sm text-neutral-600">Общая сумма заказа</div>
                    <div className="text-2xl font-semibold text-neutral-900 mt-1">
                      €{totalCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || items.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Создание...' : 'Создать заказ'}
          </button>
        </div>
      </div>
    </div>
  );
}
