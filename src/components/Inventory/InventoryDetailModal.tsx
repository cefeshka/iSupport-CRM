import { useEffect, useState } from 'react';
import { X, History, Edit, Package, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import TransferModal from './TransferModal';

type Inventory = Database['public']['Tables']['inventory']['Row'];
type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface InventoryDetailModalProps {
  item: Inventory;
  onClose: () => void;
  onEdit: (item: Inventory) => void;
  onUpdate: () => void;
}

export default function InventoryDetailModal({ item, onClose, onEdit, onUpdate }: InventoryDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadMovements();
    }
    if (item.supplier_id) {
      loadSupplier();
    }
  }, [activeTab, item]);

  async function loadMovements() {
    setLoading(true);
    const { data } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('inventory_id', item.id)
      .order('created_at', { ascending: false });

    if (data) setMovements(data);
    setLoading(false);
  }

  async function loadSupplier() {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', item.supplier_id)
      .maybeSingle();

    if (data) setSupplier(data);
  }

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Purchase';
      case 'sale': return 'Sale';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'text-green-600 bg-green-50';
      case 'sale': return 'text-blue-600 bg-blue-50';
      case 'adjustment': return 'text-amber-600 bg-amber-50';
      default: return 'text-neutral-600 bg-neutral-50';
    }
  };

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{item.part_name}</h2>
              <p className="text-sm text-neutral-500">SKU: {item.sku || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="border-b border-neutral-200">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <History className="w-4 h-4" />
              Movement History
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Part Name</label>
                  <div className="px-3 py-2 bg-neutral-50 rounded-lg text-neutral-900">{item.part_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">SKU</label>
                  <div className="px-3 py-2 bg-neutral-50 rounded-lg text-neutral-900">{item.sku || 'N/A'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Barcode</label>
                  <div className="px-3 py-2 bg-neutral-50 rounded-lg text-neutral-900">{item.barcode || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Location</label>
                  <div className="px-3 py-2 bg-neutral-50 rounded-lg text-neutral-900">{item.location || 'N/A'}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Current Stock</label>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg text-blue-900 font-semibold text-lg">
                    {item.quantity}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Min Quantity</label>
                  <div className="px-3 py-2 bg-neutral-50 rounded-lg text-neutral-900">{item.min_quantity}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Unit Cost</label>
                  <div className="px-3 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                    €{item.unit_cost?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              {supplier && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Primary Supplier</label>
                  <div className="px-4 py-3 bg-neutral-50 rounded-lg">
                    <div className="font-medium text-neutral-900">{supplier.name}</div>
                    {supplier.contact_person && (
                      <div className="text-sm text-neutral-600 mt-1">Contact: {supplier.contact_person}</div>
                    )}
                    {supplier.phone && (
                      <div className="text-sm text-neutral-600">Phone: {supplier.phone}</div>
                    )}
                    {supplier.email && (
                      <div className="text-sm text-neutral-600">Email: {supplier.email}</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Created</label>
                <div className="px-3 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                  {new Date(item.created_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-neutral-500">Loading history...</div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">No movement history yet</div>
              ) : (
                <div className="space-y-3">
                  {movements.map((movement) => (
                    <div
                      key={movement.id}
                      className="px-4 py-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getMovementTypeColor(movement.movement_type)}`}>
                            {getMovementTypeLabel(movement.movement_type)}
                          </span>
                          <span className={`font-semibold ${movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {new Date(movement.created_at).toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                      {movement.notes && (
                        <p className="text-sm text-neutral-600">{movement.notes}</p>
                      )}
                      {movement.cost_per_unit > 0 && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Cost per unit: €{movement.cost_per_unit.toFixed(2)}
                        </p>
                      )}
                      {movement.order_id && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Order ID: {movement.order_id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex items-center gap-3">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Item
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {showTransferModal && (
        <TransferModal
          item={item}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
