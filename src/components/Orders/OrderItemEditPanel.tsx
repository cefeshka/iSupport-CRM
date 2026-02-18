import { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';

type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type InventoryItem = Database['public']['Tables']['inventory']['Row'];

interface OrderItemEditPanelProps {
  orderId: string;
  item: OrderItem | null;
  onClose: () => void;
  onSave: () => void;
}

export default function OrderItemEditPanel({ orderId, item, onClose, onSave }: OrderItemEditPanelProps) {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [showInventorySearch, setShowInventorySearch] = useState(false);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [warrantyDays, setWarrantyDays] = useState(0);
  const [warrantyMonths, setWarrantyMonths] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string>('');
  const [itemComment, setItemComment] = useState('');
  const [itemType, setItemType] = useState('service');
  const [inventoryId, setInventoryId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
    loadInventory();
    if (item) {
      setName(item.name);
      setQuantity(item.quantity);
      setWarrantyDays(item.warranty_days);
      setWarrantyMonths(item.warranty_months);
      setUnitCost(item.unit_cost);
      setUnitPrice(item.unit_price);
      setDiscountType(item.discount_type as 'percent' | 'fixed');
      setDiscountValue(item.discount_value);
      setAssignedTechnicianId(item.assigned_technician_id || '');
      setItemComment(item.item_comment || '');
      setItemType(item.item_type);
      setInventoryId(item.inventory_id);
    } else {
      setAssignedTechnicianId(profile?.id || '');
    }
  }, [item, profile]);

  useEffect(() => {
    if (itemType === 'part' && name.trim() && !inventoryId) {
      const filtered = inventoryItems.filter(inv =>
        inv.part_name.toLowerCase().includes(name.toLowerCase()) ||
        (inv.sku && inv.sku.toLowerCase().includes(name.toLowerCase()))
      );
      setFilteredInventory(filtered);
      setShowInventorySearch(filtered.length > 0);
    } else {
      setFilteredInventory([]);
      if (!inventoryId) {
        setShowInventorySearch(false);
      }
    }
  }, [name, inventoryItems, itemType, inventoryId]);

  async function loadProfiles() {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  }

  async function loadInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('part_name');
    if (data) setInventoryItems(data);
  }

  function selectInventoryItem(invItem: InventoryItem) {
    setInventoryId(invItem.id);
    setName(invItem.part_name);
    setUnitCost(invItem.unit_cost || 0);
    setUnitPrice((invItem.unit_cost || 0) * 1.5);
    setShowInventorySearch(false);
  }

  const calculateTotal = () => {
    const subtotal = unitPrice * quantity;
    const discount = discountType === 'percent'
      ? subtotal * (discountValue / 100)
      : discountValue;
    return subtotal - discount;
  };

  const calculateProfit = () => {
    const total = calculateTotal();
    if (itemType === 'service') {
      return total;
    } else {
      const cost = unitCost * quantity;
      return total - cost;
    }
  };

  async function handleSave() {
    if (!name.trim()) return;

    const totalPrice = calculateTotal();
    const profit = calculateProfit();
    const costPrice = unitCost * quantity;
    const sellingPrice = unitPrice * quantity;

    const itemData = {
      order_id: orderId,
      inventory_id: itemType === 'part' ? inventoryId : null,
      name,
      quantity,
      warranty_days: warrantyDays,
      warranty_months: warrantyMonths,
      unit_cost: unitCost,
      unit_price: unitPrice,
      discount_type: discountType,
      discount_value: discountValue,
      assigned_technician_id: assignedTechnicianId || null,
      item_comment: itemComment || null,
      item_type: itemType,
      cost_price: costPrice,
      selling_price: sellingPrice,
      total_price: totalPrice,
      profit: profit,
    };

    if (item) {
      await supabase
        .from('order_items')
        .update(itemData)
        .eq('id', item.id);
    } else {
      await supabase
        .from('order_items')
        .insert(itemData);
    }

    onSave();
    onClose();
  }

  async function handleDelete() {
    if (item && confirm('Удалить эту позицию?')) {
      await supabase.from('order_items').delete().eq('id', item.id);
      onSave();
      onClose();
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
      <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <h2 className="text-lg font-semibold">{item ? name : 'Новая позиция'}</h2>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Тип</label>
          <select
            value={itemType}
            onChange={(e) => {
              const newType = e.target.value;
              setItemType(newType);
              if (newType !== 'part') {
                setInventoryId(null);
                setShowInventorySearch(false);
              }
            }}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="service">Работа</option>
            <option value="part">Деталь</option>
            <option value="accessory">Аксессуар</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Название <span className="text-red-500">*</span>
          </label>
          {itemType === 'part' ? (
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (inventoryId) {
                      setInventoryId(null);
                    }
                  }}
                  placeholder="Начните вводить название или SKU..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onFocus={() => {
                    if (name.trim() && !inventoryId) {
                      setShowInventorySearch(true);
                    }
                  }}
                />
                {inventoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setInventoryId(null);
                      setName('');
                      setUnitCost(0);
                      setUnitPrice(0);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700 px-2"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              {inventoryId && (
                <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  ✓ Запчасть со склада (остаток будет обновлен)
                </div>
              )}
              {showInventorySearch && filteredInventory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  <div className="p-1">
                    {filteredInventory.map((invItem) => (
                      <button
                        key={invItem.id}
                        type="button"
                        onClick={() => selectInventoryItem(invItem)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 rounded transition-colors border-b border-neutral-100 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-neutral-900">{invItem.part_name}</div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              SKU: {invItem.sku || 'N/A'} | Cost: €{invItem.unit_cost?.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-medium ${invItem.quantity <= invItem.min_quantity ? 'text-amber-600' : 'text-green-600'}`}>
                              {invItem.quantity} шт
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название услуги"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Количество <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              +
            </button>
            <span className="text-sm text-neutral-500">pcs</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Гарантия клиенту</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-neutral-500">d</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-neutral-500">mo</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Себестоимость, €</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={unitCost}
            onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Цена продажи, € <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Скидка</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex border border-neutral-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setDiscountType('fixed')}
                className={`px-3 py-2 text-sm transition-colors ${
                  discountType === 'fixed'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                €
              </button>
              <button
                onClick={() => setDiscountType('percent')}
                className={`px-3 py-2 text-sm transition-colors ${
                  discountType === 'percent'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                %
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Техник</label>
          <select
            value={assignedTechnicianId}
            onChange={(e) => setAssignedTechnicianId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Не назначен</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Комментарий</label>
          <textarea
            value={itemComment}
            onChange={(e) => setItemComment(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Добавьте комментарий к этой позиции..."
          />
        </div>

        <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Subtotal:</span>
            <span className="font-medium">{(unitPrice * quantity).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Discount:</span>
            <span className="font-medium text-red-600">
              -{(discountType === 'percent'
                ? (unitPrice * quantity * discountValue / 100)
                : discountValue
              ).toFixed(2)} €
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t pt-2">
            <span>Total:</span>
            <span>{calculateTotal().toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Estimated profit:</span>
            <span className="font-medium text-green-600">{calculateProfit().toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-neutral-200 flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          Сохранить
        </button>
        {item && (
          <button
            onClick={handleDelete}
            className="w-10 h-10 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
