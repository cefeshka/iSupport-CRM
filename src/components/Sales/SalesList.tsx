import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, ShoppingCart, Calendar, DollarSign, Package, Search, Filter, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];

interface Sale {
  id: string;
  item_id: string;
  quantity: number;
  sale_price: number;
  total_amount: number;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
  item?: InventoryItem;
}

export default function SalesList() {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showNewSale, setShowNewSale] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (currentLocation) {
      loadData();
    }
  }, [currentLocation]);

  async function loadData() {
    if (!currentLocation) return;

    setLoading(true);
    await Promise.all([loadSales(), loadInventory()]);
    setLoading(false);
  }

  async function loadSales() {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('created_at', { ascending: false });

    if (data) {
      setSales([]);
    }
  }

  async function loadInventory() {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('location_id', currentLocation.id)
      .gt('quantity', 0)
      .order('part_name');

    if (data) {
      setInventoryItems(data);
    }
  }

  async function handleCreateSale() {
    if (!profile || !selectedItemId || quantity <= 0 || !salePrice) return;

    const selectedItem = inventoryItems.find(item => item.id === selectedItemId);
    if (!selectedItem || selectedItem.quantity < quantity) {
      alert('Недостаточно товара на складе');
      return;
    }

    const totalAmount = parseFloat(salePrice) * quantity;

    setShowNewSale(false);
    resetForm();
    loadData();
  }

  function resetForm() {
    setSelectedItemId('');
    setQuantity(1);
    setSalePrice('');
    setCustomerName('');
    setNotes('');
  }

  function handleItemChange(itemId: string) {
    setSelectedItemId(itemId);
    const item = inventoryItems.find(i => i.id === itemId);
    if (item && item.price) {
      setSalePrice(item.price.toString());
    }
  }

  const filteredSales = sales.filter(sale =>
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.item?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalSales = sales.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Продажи</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Управление продажами товаров и аксессуаров
            </p>
          </div>
          <button
            onClick={() => setShowNewSale(true)}
            className="px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-lg hover:from-fuchsia-600 hover:to-pink-600 transition-all shadow-md shadow-fuchsia-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Новая продажа
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">Общая выручка</p>
                <p className="text-2xl font-bold text-green-900">{totalRevenue.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 mb-1">Всего продаж</p>
                <p className="text-2xl font-bold text-blue-900">{totalSales}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 mb-1">Средний чек</p>
                <p className="text-2xl font-bold text-purple-900">
                  {totalSales > 0 ? Math.round(totalRevenue / totalSales).toLocaleString('ru-RU') : 0} ₽
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по клиенту или товару..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
          <button className="px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-600" />
            <span className="text-sm text-neutral-600">Фильтры</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-neutral-500">Загрузка...</div>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
          <ShoppingCart className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-neutral-900 mb-1">Нет продаж</h3>
          <p className="text-xs text-neutral-500 mb-4">
            Начните продавать товары со склада
          </p>
          <button
            onClick={() => setShowNewSale(true)}
            className="px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-lg hover:from-fuchsia-600 hover:to-pink-600 transition-all text-sm"
          >
            Создать первую продажу
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-600">Дата</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-600">Товар</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-600">Клиент</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-600">Количество</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-600">Цена</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-600">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {new Date(sale.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-neutral-900">
                        {sale.item?.name || 'Удаленный товар'}
                      </div>
                      {sale.notes && (
                        <div className="text-xs text-neutral-500 mt-0.5">{sale.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {sale.customer_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-900 text-right font-medium">
                      {sale.quantity} шт.
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-900 text-right">
                      {sale.sale_price.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-green-600 text-right">
                      {sale.total_amount.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNewSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Новая продажа</h3>
              <button
                onClick={() => {
                  setShowNewSale(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Выберите товар
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleItemChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="">Выберите товар...</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (В наличии: {item.quantity} шт.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Количество
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Цена продажи
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>

              {salePrice && quantity > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 mb-1">Итого к оплате:</p>
                  <p className="text-xl font-bold text-green-900">
                    {(parseFloat(salePrice) * quantity).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Покупатель (необязательно)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Имя покупателя"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Примечание (необязательно)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дополнительная информация..."
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowNewSale(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateSale}
                  disabled={!selectedItemId || quantity <= 0 || !salePrice}
                  className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-lg hover:from-fuchsia-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Продать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
