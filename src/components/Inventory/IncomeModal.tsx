import { useState, useEffect } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast, handleSupabaseError } from '../../lib/toast';
import type { Database } from '../../lib/database.types';

type Inventory = Database['public']['Tables']['inventory']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface IncomeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function IncomeModal({ onClose, onSuccess }: IncomeModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
  const [filteredItems, setFilteredItems] = useState<Inventory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);

  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);

  const [newItemSku, setNewItemSku] = useState('');
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemMinQuantity, setNewItemMinQuantity] = useState(5);

  useEffect(() => {
    loadSuppliers();
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

  async function loadSuppliers() {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (data) setSuppliers(data);
  }

  async function loadInventoryItems() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('part_name');
    if (data) setInventoryItems(data);
  }

  function selectInventoryItem(item: Inventory) {
    setSelectedInventoryId(item.id);
    setItemName(item.part_name);
    setPurchasePrice(item.unit_cost || 0);
    if (item.supplier_id) {
      setSupplierId(item.supplier_id);
    }
    setShowItemSearch(false);
    setSearchTerm('');
    setIsNewItem(false);
  }

  function switchToNewItem() {
    setSelectedInventoryId(null);
    setItemName('');
    setPurchasePrice(0);
    setNewItemSku('');
    setNewItemBarcode('');
    setNewItemLocation('');
    setNewItemMinQuantity(5);
    setIsNewItem(true);
    setShowItemSearch(false);
  }

  async function handleSave() {
    // Validation
    if (!itemName.trim()) {
      toast.error('Item name is required');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (purchasePrice < 0) {
      toast.error('Purchase price cannot be negative');
      return;
    }

    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Adding stock...');

    try {
      let inventoryId = selectedInventoryId;

      if (isNewItem) {
        const { data: newItem, error: createError } = await supabase
          .from('inventory')
          .insert({
            part_name: itemName.trim(),
            sku: newItemSku.trim() || null,
            barcode: newItemBarcode.trim() || null,
            quantity: quantity,
            unit_cost: purchasePrice,
            location: newItemLocation.trim() || null,
            min_quantity: newItemMinQuantity,
            supplier_id: supplierId
          })
          .select()
          .single();

        if (createError) {
          toast.dismiss(toastId);
          handleSupabaseError(createError, 'Create inventory item');
          return;
        }
        inventoryId = newItem.id;
      } else {
        const currentItem = inventoryItems.find(i => i.id === inventoryId);
        if (!currentItem) {
          toast.dismiss(toastId);
          toast.error('Inventory item not found');
          return;
        }

        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            quantity: currentItem.quantity + quantity,
            unit_cost: purchasePrice,
            supplier_id: supplierId
          })
          .eq('id', inventoryId);

        if (updateError) {
          toast.dismiss(toastId);
          handleSupabaseError(updateError, 'Update inventory');
          return;
        }
      }

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_id: inventoryId,
          movement_type: 'purchase',
          quantity: quantity,
          cost_per_unit: purchasePrice,
          supplier_id: supplierId,
          notes: notes.trim() || `Stock received from supplier`,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (movementError) {
        toast.dismiss(toastId);
        handleSupabaseError(movementError, 'Record movement');
        return;
      }

      toast.dismiss(toastId);
      toast.success('Stock added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.dismiss(toastId);
      handleSupabaseError(error, 'Add stock');
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-neutral-900">New Income - Receive Stock</h2>
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
              Item Selection <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  setIsNewItem(false);
                  setShowItemSearch(true);
                }}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  !isNewItem
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                Existing Item
              </button>
              <button
                onClick={switchToNewItem}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  isNewItem
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                New Item
              </button>
            </div>

            {!isNewItem && (
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemName}
                    readOnly={!!selectedInventoryId}
                    placeholder="Select an existing item"
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setShowItemSearch(!showItemSearch)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </div>

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
                            <div className="text-sm font-medium text-neutral-900">{item.part_name}</div>
                            <div className="text-xs text-neutral-500">
                              SKU: {item.sku || 'N/A'} | Current Stock: {item.quantity}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isNewItem && (
              <div className="space-y-3 mt-3">
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Item name"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    placeholder="SKU (Optional)"
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={newItemBarcode}
                    onChange={(e) => setNewItemBarcode(e.target.value)}
                    placeholder="Barcode (Optional)"
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value)}
                    placeholder="Storage location"
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={newItemMinQuantity}
                    onChange={(e) => setNewItemMinQuantity(parseInt(e.target.value) || 0)}
                    placeholder="Min quantity alert"
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Purchase Price per Unit, EUR <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select supplier...</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Additional notes about this stock receipt..."
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-neutral-700">Total Cost:</span>
              <span className="font-semibold text-neutral-900">
                €{(quantity * purchasePrice).toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-neutral-600">
              {quantity} units × €{purchasePrice.toFixed(2)} per unit
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !itemName || !supplierId || quantity <= 0}
            className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Receiving...' : 'Receive Stock'}
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
