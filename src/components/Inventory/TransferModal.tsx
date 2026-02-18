import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, ArrowRight, MapPin } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';

type Inventory = Database['public']['Tables']['inventory']['Row'];

interface Location {
  id: number;
  name: string;
  address: string | null;
}

interface TransferModalProps {
  item: Inventory;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferModal({ item, onClose, onSuccess }: TransferModalProps) {
  const { locations, currentLocation } = useLocation();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableLocations = locations.filter(loc => loc.id !== currentLocation?.id);

  async function handleTransfer() {
    if (!selectedLocationId || !currentLocation) {
      setError('Выберите филиал назначения');
      return;
    }

    if (quantity <= 0 || quantity > item.quantity) {
      setError(`Количество должно быть от 1 до ${item.quantity}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const targetLocationInventory = await supabase
        .from('inventory')
        .select('*')
        .eq('sku', item.sku)
        .eq('location_id', selectedLocationId)
        .maybeSingle();

      if (targetLocationInventory.error && targetLocationInventory.error.code !== 'PGRST116') {
        throw targetLocationInventory.error;
      }

      const currentInventoryUpdate = await supabase
        .from('inventory')
        .update({ quantity: item.quantity - quantity })
        .eq('id', item.id);

      if (currentInventoryUpdate.error) throw currentInventoryUpdate.error;

      if (targetLocationInventory.data) {
        const targetUpdate = await supabase
          .from('inventory')
          .update({ quantity: targetLocationInventory.data.quantity + quantity })
          .eq('id', targetLocationInventory.data.id);

        if (targetUpdate.error) throw targetUpdate.error;
      } else {
        const newItem = await supabase
          .from('inventory')
          .insert({
            part_name: item.part_name,
            sku: item.sku,
            barcode: item.barcode,
            quantity: quantity,
            unit_cost: item.unit_cost,
            location: item.location,
            min_quantity: item.min_quantity,
            supplier_id: item.supplier_id,
            location_id: selectedLocationId
          });

        if (newItem.error) throw newItem.error;
      }

      const movementInsert = await supabase
        .from('inventory_movements')
        .insert({
          inventory_id: item.id,
          movement_type: 'transfer',
          quantity: -quantity,
          location_id: currentLocation.id,
          destination_location_id: selectedLocationId,
          notes: `Трансфер в ${locations.find(l => l.id === selectedLocationId)?.name}`
        });

      if (movementInsert.error) throw movementInsert.error;

      onSuccess();
    } catch (error) {
      console.error('Error transferring inventory:', error);
      setError('Ошибка при переносе товара. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">
            Переместить на другой филиал
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-sm text-neutral-600 mb-1">Товар</div>
            <div className="font-semibold text-neutral-900">{item.part_name}</div>
            <div className="text-sm text-neutral-600 mt-1">
              SKU: {item.sku} • Доступно: {item.quantity} шт.
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 bg-blue-50 rounded-lg p-4 text-center">
              <MapPin className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-sm font-medium text-blue-900">
                {currentLocation?.name}
              </div>
              <div className="text-xs text-blue-600 mt-1">Откуда</div>
            </div>

            <ArrowRight className="w-6 h-6 text-neutral-400 flex-shrink-0" />

            <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
              <MapPin className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <div className="text-sm font-medium text-green-900">
                {selectedLocationId
                  ? locations.find(l => l.id === selectedLocationId)?.name
                  : 'Не выбрано'}
              </div>
              <div className="text-xs text-green-600 mt-1">Куда</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Выберите филиал назначения
            </label>
            <div className="space-y-2">
              {availableLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocationId(location.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedLocationId === location.id
                      ? 'border-green-500 bg-green-50 text-green-900'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{location.name}</div>
                    {location.address && (
                      <div className="text-xs text-neutral-500">{location.address}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Количество для перемещения
            </label>
            <input
              type="number"
              min="1"
              max={item.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleTransfer}
              disabled={loading || !selectedLocationId}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Перемещение...' : 'Переместить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
