import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, AlertTriangle, Search, TrendingDown, Plus, Minus } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { Database } from '../../lib/database.types';
import InventoryDetailModal from './InventoryDetailModal';
import IncomeModal from './IncomeModal';
import OutcomeModal from './OutcomeModal';
import EditInventoryModal from './EditInventoryModal';

type Inventory = Database['public']['Tables']['inventory']['Row'] & {
  supplier?: {
    name: string;
  } | null;
};

export default function InventoryList() {
  const { currentLocation } = useLocation();
  const { canAddInventory, canEditInventory, canDeleteInventory } = usePermissions();
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);

  useEffect(() => {
    loadInventory();
  }, [currentLocation]);

  async function loadInventory() {
    try {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .order('part_name');

      if (currentLocation?.id) {
        query = query.or(`location_id.eq.${currentLocation.id},location_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading inventory:', error);
      } else if (data) {
        setInventory(data);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(item: Inventory) {
    setSelectedItem(null);
    setEditingItem(item);
  }

  const filteredInventory = inventory.filter((item) =>
    item.part_name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = inventory.filter((item) => item.quantity <= item.min_quantity);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-neutral-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="glass-panel p-6 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Склад</h1>
          <p className="text-slate-600 mt-2 font-medium">Управление запасами и деталями</p>
        </div>
        <div className="flex items-center gap-3">
          {canEditInventory() && (
            <button
              onClick={() => setShowOutcomeModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-medium flex items-center gap-2 shadow-glow"
            >
              <Minus className="w-4 h-4" />
              Списать
            </button>
          )}
          {canAddInventory() && (
            <button
              onClick={() => setShowIncomeModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-medium flex items-center gap-2 shadow-glow"
            >
              <Plus className="w-4 h-4" />
              Приход
            </button>
          )}
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-medium">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Низкий запас</h3>
              <p className="text-sm text-amber-800 mt-1 font-medium">
                {lowStockItems.length} {lowStockItems.length === 1 ? 'позиция требует' : 'позиций требуют'} пополнения
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 glass-panel p-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или артикулу..."
            className="input-premium w-full pl-12"
          />
        </div>
      </div>

      <div className="table-premium">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Артикул
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Штрихкод
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Остаток
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Цена
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Локация
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Поставщик
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const isLowStock = item.quantity <= item.min_quantity;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-white/80 transition-all cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-neutral-600" />
                        </div>
                        <div className="font-medium text-neutral-900">{item.part_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600 font-mono">{item.sku || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600 font-mono">{item.barcode || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isLowStock && <TrendingDown className="w-4 h-4 text-amber-500" />}
                        <span className={`font-medium ${isLowStock ? 'text-amber-600' : 'text-neutral-900'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-sm text-neutral-500">/ min. {item.min_quantity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-neutral-900">€{item.unit_cost?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600">{item.location || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600">{item.supplier?.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {isLowStock ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="py-12 text-center text-neutral-500">
            No parts found
          </div>
        )}
      </div>

      {selectedItem && (
        <InventoryDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={handleEdit}
          onUpdate={() => {
            loadInventory();
            setSelectedItem(null);
          }}
        />
      )}

      {showIncomeModal && (
        <IncomeModal
          onClose={() => setShowIncomeModal(false)}
          onSuccess={() => {
            loadInventory();
            setShowIncomeModal(false);
          }}
        />
      )}

      {showOutcomeModal && (
        <OutcomeModal
          onClose={() => setShowOutcomeModal(false)}
          onSuccess={() => {
            loadInventory();
            setShowOutcomeModal(false);
          }}
        />
      )}

      {editingItem && (
        <EditInventoryModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            loadInventory();
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
