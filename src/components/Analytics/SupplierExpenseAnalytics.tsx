import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import { DollarSign, Package } from 'lucide-react';

interface PurchaseExpense {
  date: string;
  item_name: string;
  supplier_name: string;
  unit_cost: number;
  quantity: number;
  total: number;
  purchase_order_number: string;
}

interface SupplierExpenseAnalyticsProps {
  dateFilter: 'today' | 'week' | 'month' | 'year' | 'custom';
  customDateFrom?: string;
  customDateTo?: string;
}

export function SupplierExpenseAnalytics({
  dateFilter,
  customDateFrom,
  customDateTo
}: SupplierExpenseAnalyticsProps) {
  const { currentLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [purchases, setPurchases] = useState<PurchaseExpense[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      loadExpenses();
    }
  }, [currentLocation, dateFilter, customDateFrom, customDateTo, selectedSupplier]);

  function getDateRange(): { from: Date; to: Date } {
    const now = new Date();
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    let from = new Date();

    switch (dateFilter) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        from.setHours(0, 0, 0, 0);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        from.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (customDateFrom) from = new Date(customDateFrom);
        if (customDateTo) to.setTime(new Date(customDateTo).getTime());
        break;
    }

    return { from, to };
  }

  async function loadSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  }

  async function loadExpenses() {
    if (!currentLocation) return;

    setLoading(true);
    const { from, to } = getDateRange();

    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          order_number,
          created_at,
          supplier:suppliers(id, name),
          items:purchase_order_items(
            id,
            unit_cost,
            quantity_ordered,
            quantity_received,
            total_cost,
            inventory:inventory(part_name)
          )
        `)
        .eq('location_id', currentLocation.id)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .in('status', ['received', 'partial']);

      const { data: purchaseOrders, error } = await query;

      if (error) throw error;

      const expensesList: PurchaseExpense[] = [];
      let total = 0;

      purchaseOrders?.forEach((po: any) => {
        po.items?.forEach((item: any) => {
          const supplierName = po.supplier?.name || 'Unknown';

          if (selectedSupplier === 'all' || po.supplier?.id === selectedSupplier) {
            const expense: PurchaseExpense = {
              date: new Date(po.created_at).toLocaleDateString('en-US'),
              item_name: item.inventory?.part_name || 'Unknown',
              supplier_name: supplierName,
              unit_cost: item.unit_cost || 0,
              quantity: item.quantity_received || item.quantity_ordered || 0,
              total: item.total_cost || 0,
              purchase_order_number: po.order_number || 'N/A'
            };

            expensesList.push(expense);
            total += expense.total;
          }
        });
      });

      expensesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setPurchases(expensesList);
      setTotalSpent(total);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-900">Supplier Expense Analytics</h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-6 h-6" />
              <h3 className="text-lg font-medium opacity-90">Total Spent on Parts</h3>
            </div>
            <div className="text-4xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-sm opacity-75 mt-2">
              {purchases.length} purchase{purchases.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <Package className="w-10 h-10" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <h3 className="text-lg font-semibold text-neutral-900">Purchase Breakdown</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Detailed list of all parts purchased from suppliers
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-neutral-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-sm text-neutral-500 mt-3">Loading expense data...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 font-medium">No purchases found</p>
            <p className="text-sm text-neutral-500 mt-1">
              No parts have been purchased in the selected period
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {purchases.map((purchase, index) => (
                  <tr key={index} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {purchase.date}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded text-neutral-700">
                        {purchase.purchase_order_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-neutral-900">{purchase.item_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                          {purchase.supplier_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-neutral-900">{purchase.supplier_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-neutral-700">
                      {formatCurrency(purchase.unit_cost)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {purchase.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-red-600">
                        {formatCurrency(purchase.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 border-t-2 border-neutral-300">
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-right text-sm font-semibold text-neutral-900">
                    Grand Total:
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(totalSpent)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">About Supplier Expenses</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-neutral-700">
          <div>
            <p className="font-medium text-neutral-900 mb-1">Calculation Method</p>
            <p>Total = Unit Cost × Quantity for all received purchase orders</p>
          </div>
          <div>
            <p className="font-medium text-neutral-900 mb-1">Data Source</p>
            <p>Based on purchase orders with status "Received" or "Partial"</p>
          </div>
          <div>
            <p className="font-medium text-neutral-900 mb-1">Location Filter</p>
            <p>Shows expenses for currently selected location only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
