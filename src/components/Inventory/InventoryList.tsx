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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Warehouse</h1>
          <p className="text-neutral-500 mt-1">Inventory and parts management</p>
        </div>
        <div className="flex items-center gap-3">
          {canEditInventory() && (
            <button
              onClick={() => setShowOutcomeModal(true)}
              className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
            >
              <Minus className="w-4 h-4" />
              Manual Write-off
            </button>
          )}
          {canAddInventory() && (
            <button
              onClick={() => setShowIncomeModal(true)}
              className="px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Income
            </button>
          )}
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Low Stock Alert</h3>
              <p className="text-sm text-amber-700 mt-1">
                {lowStockItems.length} {lowStockItems.length === 1 ? 'item needs' : 'items need'} restocking
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Part Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Barcode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredInventory.map((item) => {
                const isLowStock = item.quantity <= item.min_quantity;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-neutral-50 transition-colors cursor-pointer"
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
