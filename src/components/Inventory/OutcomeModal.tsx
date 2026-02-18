import { useState, useEffect } from 'react';
import { X, Minus, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast, handleSupabaseError } from '../../lib/toast';
import type { Database } from '../../lib/database.types';

type Inventory = Database['public']['Tables']['inventory']['Row'];

interface OutcomeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function OutcomeModal({ onClose, onSuccess }: OutcomeModalProps) {
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
  const [filteredItems, setFilteredItems] = useState<Inventory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);

  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInventoryItems();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = inventoryItems.filter(item =>
        item.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(inventoryItems);
    }
  }, [searchTerm, inventoryItems]);

  async function loadInventoryItems() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('part_name');
    if (data) setInventoryItems(data);
  }

  function selectInventoryItem(item: Inventory) {
    setSelectedInventoryId(item.id);
    setSelectedItem(item);
    setItemName(item.part_name);
    setShowItemSearch(false);
    setSearchTerm('');
  }

  async function handleSave() {
    // Validation
    if (!selectedInventoryId) {
      toast.error('Please select an item');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for stock adjustment');
      return;
    }

    if (selectedItem && quantity > selectedItem.quantity) {
      toast.error(`Cannot write off ${quantity} units. Only ${selectedItem.quantity} available in stock.`);
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Writing off stock...');

    try {
      if (!selectedItem) {
        toast.dismiss(toastId);
        toast.error('Item not found');
        return;
      }

      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          quantity: selectedItem.quantity - quantity
        })
        .eq('id', selectedInventoryId);

      if (updateError) {
        toast.dismiss(toastId);
        handleSupabaseError(updateError, 'Update inventory');
        return;
      }

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_id: selectedInventoryId,
          movement_type: 'adjustment',
          quantity: -quantity,
          notes: reason.trim(),
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (movementError) {
        toast.dismiss(toastId);
        handleSupabaseError(movementError, 'Record movement');
        return;
      }

      toast.dismiss(toastId);
      toast.success('Stock written off successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.dismiss(toastId);
      handleSupabaseError(error, 'Write off stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-neutral-900">Manual Write-off / Adjustment</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select Item <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={itemName}
                  readOnly
                  placeholder="Select an item from inventory"
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  onClick={() => setShowItemSearch(!showItemSearch)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>

              {selectedItem && (
                <div className="mt-2 p-3 bg-neutral-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{selectedItem.part_name}</div>
                      <div className="text-xs text-neutral-500">SKU: {selectedItem.sku || 'N/A'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-neutral-900">
                        Available: {selectedItem.quantity}
                      </div>
                      <div className="text-xs text-neutral-500">
                        €{selectedItem.unit_cost?.toFixed(2)} per unit
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showItemSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-neutral-200">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or SKU..."
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="p-1">
                    {filteredItems.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-neutral-500">No items found</div>
                    ) : (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => selectInventoryItem(item)}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-50 rounded transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-neutral-900">{item.part_name}</div>
                              <div className="text-xs text-neutral-500">
                                SKU: {item.sku || 'N/A'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-neutral-900">
                                {item.quantity} in stock
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Quantity to Write Off <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedItem?.quantity || 999}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedItem}
            />
            {selectedItem && quantity > selectedItem.quantity && (
              <p className="text-xs text-red-600 mt-1">
                Only {selectedItem.quantity} units available
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Reason for Write-off <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g., Damaged during handling, Lost item, Defective part, etc."
            />
          </div>

          {selectedItem && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  !
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-900 mb-1">Stock Adjustment Impact</div>
                  <div className="space-y-1 text-xs text-amber-800">
                    <div className="flex justify-between">
                      <span>Current stock:</span>
                      <span className="font-semibold">{selectedItem.quantity} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>After write-off:</span>
                      <span className="font-semibold">{selectedItem.quantity - quantity} units</span>
                    </div>
                    <div className="flex justify-between border-t border-amber-300 pt-1 mt-1">
                      <span>Estimated value loss:</span>
                      <span className="font-semibold">
                        €{((selectedItem.unit_cost || 0) * quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !selectedInventoryId || !reason.trim() || quantity <= 0 || (selectedItem && quantity > selectedItem.quantity)}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Minus className="w-4 h-4" />
            {saving ? 'Processing...' : 'Write Off Stock'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
