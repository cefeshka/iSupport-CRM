import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { Package, AlertTriangle, CheckCircle, XCircle, Save, FileCheck } from 'lucide-react';
import { toast } from '../../lib/toast';

interface InventoryItem {
  id: string;
  part_name: string;
  sku: string;
  quantity: number;
  location: string;
}

interface AuditItem {
  id?: string;
  inventory_id: string;
  part_name: string;
  sku: string;
  system_quantity: number;
  physical_count: number | null;
  discrepancy: number;
  correction_reason: string;
  notes: string;
}

export default function InventoryAudit() {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [auditStatus, setAuditStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');

  useEffect(() => {
    loadInventory();
    checkExistingAudit();
  }, [currentLocation]);

  const checkExistingAudit = async () => {
    if (!currentLocation?.id) return;

    const { data, error } = await supabase
      .from('stock_audits')
      .select('id, status')
      .eq('location_id', currentLocation.id)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (error) {
      console.error('Error checking existing audit:', error);
      return;
    }

    if (data) {
      setCurrentAuditId((data as any).id);
      setAuditStatus('in_progress');
      loadExistingAudit((data as any).id);
    }
  };

  const loadExistingAudit = async (auditId: string) => {
    const { data, error } = await supabase
      .from('stock_audit_items')
      .select(`
        id,
        inventory_id,
        system_quantity,
        physical_count,
        discrepancy,
        correction_reason,
        notes,
        inventory:inventory_id (
          part_name,
          sku
        )
      `)
      .eq('audit_id', auditId);

    if (error) {
      console.error('Error loading audit items:', error);
      return;
    }

    const items = data.map((item: any) => ({
      id: item.id,
      inventory_id: item.inventory_id,
      part_name: item.inventory.part_name,
      sku: item.inventory.sku,
      system_quantity: item.system_quantity,
      physical_count: item.physical_count,
      discrepancy: item.discrepancy || 0,
      correction_reason: item.correction_reason || '',
      notes: item.notes || ''
    }));

    setAuditItems(items);
  };

  const loadInventory = async () => {
    if (!currentLocation?.id) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('id, part_name, sku, quantity, location')
      .eq('location_id', currentLocation.id)
      .order('part_name');

    if (error) {
      console.error('Error loading inventory:', error);
      toast.error('Failed to load inventory');
      setIsLoading(false);
      return;
    }

    setInventory(data || []);
    setIsLoading(false);
  };

  const startNewAudit = async () => {
    if (!currentLocation?.id || !profile) return;

    const auditNumber = `AUD-${Date.now()}`;

    const { data: audit, error: auditError } = await supabase
      .from('stock_audits')
      .insert({
        location_id: currentLocation.id,
        audit_number: auditNumber,
        status: 'in_progress',
        started_by: profile.id
      } as any)
      .select()
      .single();

    if (auditError) {
      console.error('Error creating audit:', auditError);
      toast.error('Failed to start audit');
      return;
    }

    setCurrentAuditId((audit as any).id);
    setAuditStatus('in_progress');

    const items = inventory.map(item => ({
      inventory_id: item.id,
      part_name: item.part_name,
      sku: item.sku,
      system_quantity: item.quantity,
      physical_count: null,
      discrepancy: 0,
      correction_reason: '',
      notes: ''
    }));

    const { error: itemsError } = await supabase
      .from('stock_audit_items')
      .insert(
        items.map(item => ({
          audit_id: (audit as any).id,
          inventory_id: item.inventory_id,
          system_quantity: item.system_quantity
        })) as any
      );

    if (itemsError) {
      console.error('Error creating audit items:', itemsError);
      toast.error('Failed to create audit items');
      return;
    }

    setAuditItems(items);
    toast.success('Audit started successfully');
  };

  const updatePhysicalCount = (inventoryId: string, count: number | null) => {
    setAuditItems(prev =>
      prev.map(item => {
        if (item.inventory_id === inventoryId) {
          const physical = count !== null ? count : 0;
          const discrepancy = count !== null ? physical - item.system_quantity : 0;
          return { ...item, physical_count: count, discrepancy };
        }
        return item;
      })
    );
  };

  const updateCorrectionReason = (inventoryId: string, reason: string) => {
    setAuditItems(prev =>
      prev.map(item =>
        item.inventory_id === inventoryId ? { ...item, correction_reason: reason } : item
      )
    );
  };

  const updateNotes = (inventoryId: string, notes: string) => {
    setAuditItems(prev =>
      prev.map(item =>
        item.inventory_id === inventoryId ? { ...item, notes } : item
      )
    );
  };

  const saveProgress = async () => {
    if (!currentAuditId) return;

    setIsSaving(true);

    for (const item of auditItems) {
      const { error } = await supabase
        .from('stock_audit_items')
        .update({
          physical_count: item.physical_count,
          correction_reason: item.correction_reason,
          notes: item.notes,
          counted_at: item.physical_count !== null ? new Date().toISOString() : null
        } as any)
        .eq('audit_id', currentAuditId)
        .eq('inventory_id', item.inventory_id);

      if (error) {
        console.error('Error saving audit item:', error);
      }
    }

    setIsSaving(false);
    toast.success('Progress saved');
  };

  const confirmAudit = async () => {
    if (!currentAuditId || !profile) return;

    const uncountedItems = auditItems.filter(item => item.physical_count === null);
    if (uncountedItems.length > 0) {
      toast.error(`Please count all items. ${uncountedItems.length} items remaining.`);
      return;
    }

    const itemsWithDiscrepancy = auditItems.filter(item => item.discrepancy !== 0);
    const itemsWithoutReason = itemsWithDiscrepancy.filter(item => !item.correction_reason.trim());

    if (itemsWithoutReason.length > 0) {
      toast.error(`Please provide correction reasons for all items with discrepancies (${itemsWithoutReason.length} items).`);
      return;
    }

    setIsSaving(true);

    await saveProgress();

    const { data, error } = await supabase.rpc('confirm_stock_audit', {
      p_audit_id: currentAuditId,
      p_user_id: profile.id
    } as any);

    setIsSaving(false);

    if (error) {
      console.error('Error confirming audit:', error);
      toast.error('Failed to confirm audit');
      return;
    }

    if ((data as any).success) {
      toast.success(`Audit completed! ${(data as any).corrections_made} corrections applied.`);
      setAuditStatus('completed');
      setCurrentAuditId(null);
      setAuditItems([]);
      loadInventory();
    } else {
      toast.error((data as any).error || 'Failed to confirm audit');
    }
  };

  const cancelAudit = async () => {
    if (!currentAuditId) return;

    const { error } = await supabase
      .from('stock_audits')
      .update({ status: 'cancelled' } as any)
      .eq('id', currentAuditId);

    if (error) {
      console.error('Error cancelling audit:', error);
      toast.error('Failed to cancel audit');
      return;
    }

    setAuditStatus('pending');
    setCurrentAuditId(null);
    setAuditItems([]);
    toast.success('Audit cancelled');
  };

  const discrepancyCount = auditItems.filter(item => item.discrepancy !== 0).length;
  const countedItems = auditItems.filter(item => item.physical_count !== null).length;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Stock Inventory Audit</h1>
        <p className="text-neutral-600">
          Perform physical inventory count and reconcile discrepancies between system and actual stock.
        </p>
      </div>

      {auditStatus === 'pending' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
          <Package className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Start New Inventory Audit</h2>
          <p className="text-neutral-600 mb-6 max-w-md mx-auto">
            Count all items in your current location and verify against system records. Any discrepancies will be highlighted for correction.
          </p>
          <button
            onClick={startNewAudit}
            disabled={inventory.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Audit ({inventory.length} items)
          </button>
        </div>
      )}

      {auditStatus === 'in_progress' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900">Audit in Progress</div>
                  <div className="text-sm text-blue-700">
                    {countedItems} of {auditItems.length} items counted
                    {discrepancyCount > 0 && ` • ${discrepancyCount} discrepancies found`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveProgress}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium flex items-center gap-2 border border-neutral-300"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Progress'}
                </button>
                <button
                  onClick={cancelAudit}
                  className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium border border-red-200"
                >
                  Cancel Audit
                </button>
                <button
                  onClick={confirmAudit}
                  disabled={isSaving || countedItems !== auditItems.length}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm Audit
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">SKU</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase">System Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase">Physical Count</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase">Difference</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Correction Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {auditItems.map((item) => {
                    const hasDiscrepancy = item.discrepancy !== 0;
                    const isCounted = item.physical_count !== null;

                    return (
                      <tr
                        key={item.inventory_id}
                        className={`${
                          hasDiscrepancy && isCounted
                            ? 'bg-yellow-50'
                            : isCounted
                            ? 'bg-green-50'
                            : 'bg-white'
                        } hover:bg-neutral-50 transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">{item.part_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-neutral-600">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm font-medium text-neutral-900">{item.system_quantity}</div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.physical_count ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updatePhysicalCount(item.inventory_id, val === '' ? null : parseInt(val, 10));
                            }}
                            className="w-24 px-3 py-2 border border-neutral-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Count"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {isCounted && (
                            <div className="flex items-center justify-center gap-2">
                              {hasDiscrepancy ? (
                                <>
                                  {item.discrepancy > 0 ? (
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                  <span
                                    className={`font-semibold ${
                                      item.discrepancy > 0 ? 'text-orange-600' : 'text-red-600'
                                    }`}
                                  >
                                    {item.discrepancy > 0 ? '+' : ''}
                                    {item.discrepancy}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-green-600 font-medium">0</span>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasDiscrepancy && isCounted && (
                            <select
                              value={item.correction_reason}
                              onChange={(e) => updateCorrectionReason(item.inventory_id, e.target.value)}
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select reason...</option>
                              <option value="Defective">Defective</option>
                              <option value="Lost">Lost</option>
                              <option value="Stolen">Stolen</option>
                              <option value="Found">Found</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Used for testing">Used for testing</option>
                              <option value="Counting error">Counting error</option>
                              <option value="System error">System error</option>
                              <option value="Other">Other</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateNotes(item.inventory_id, e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional notes..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {discrepancyCount > 0 && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-yellow-900 mb-1">
                    {discrepancyCount} Discrepancies Found
                  </div>
                  <div className="text-sm text-yellow-800">
                    Please provide a correction reason for all items with discrepancies before confirming the audit.
                    Stock levels will be automatically updated to match physical counts.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {auditStatus === 'completed' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Audit Completed</h2>
          <p className="text-neutral-600 mb-6">
            Stock levels have been updated to match physical counts. All corrections have been logged.
          </p>
          <button
            onClick={() => {
              setAuditStatus('pending');
              loadInventory();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start New Audit
          </button>
        </div>
      )}
    </div>
  );
}
