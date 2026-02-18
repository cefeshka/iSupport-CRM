import { useState, useEffect } from 'react';
import { Search, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];

interface InventorySearchProps {
  onItemSelect: (item: InventoryItem) => void;
  onRequestPart?: (partName: string) => void;
}

export default function InventorySearch({ onItemSelect, onRequestPart }: InventorySearchProps) {
  const { currentLocation } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      loadInventory();
    }
  }, [currentLocation]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = inventory.filter(item =>
        item.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredInventory(filtered);
      setShowResults(true);
    } else {
      setFilteredInventory([]);
      setShowResults(false);
    }
  }, [searchTerm, inventory]);

  async function loadInventory() {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('quantity', { ascending: false })
      .order('part_name');

    if (data) setInventory(data);
  }

  function handleSelect(item: InventoryItem) {
    onItemSelect(item);
    setSearchTerm('');
    setShowResults(false);
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        Поиск запчасти
      </label>
      <div className="relative">
        <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm && setShowResults(true)}
          placeholder="Поиск по названию или SKU (например: 11 Pro)"
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showResults && filteredInventory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {filteredInventory.map((item) => {
            const isInStock = item.quantity > 0;
            const isLowStock = item.quantity <= item.min_quantity && item.quantity > 0;

            return (
              <div
                key={item.id}
                className={`px-4 py-3 border-b border-neutral-100 last:border-0 ${
                  !isInStock ? 'bg-red-50' : isLowStock ? 'bg-amber-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        isInStock ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div className="font-medium text-neutral-900">{item.part_name}</div>
                    </div>
                    <div className="text-sm text-neutral-500">
                      SKU: {item.sku || 'N/A'} | Себестоимость: €{item.unit_cost?.toFixed(2) || '0.00'}
                    </div>
                    {isInStock ? (
                      <div className={`text-sm font-medium mt-1 ${
                        isLowStock ? 'text-amber-700' : 'text-green-700'
                      }`}>
                        <Package className="w-3.5 h-3.5 inline mr-1" />
                        Pieejams ({item.quantity} gab.)
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-red-700 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Nav noliktavā
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {isInStock ? (
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 whitespace-nowrap"
                      >
                        Добавить
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequestPart) onRequestPart(item.part_name);
                          setShowResults(false);
                        }}
                        className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 whitespace-nowrap"
                      >
                        Pasūtīt detaļu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showResults && searchTerm && filteredInventory.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 px-4 py-3">
          <div className="text-sm text-neutral-500">
            Не найдено запчастей для "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
}
