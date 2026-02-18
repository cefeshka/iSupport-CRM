import { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import OrdersKanban from './OrdersKanban';
import OrdersTable from './OrdersTable';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type OrderStage = Database['public']['Tables']['order_stages']['Row'];

interface OrderWithDetails extends Order {
  client?: Client;
  stage?: OrderStage;
}

interface OrdersViewProps {
  onOrderClick: (order: OrderWithDetails) => void;
}

export default function OrdersView({ onOrderClick }: OrdersViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Заказы</h1>

          <div className="flex items-center gap-2 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">Канбан</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">Таблица</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          <OrdersKanban onOrderClick={onOrderClick} />
        ) : (
          <OrdersTable onOrderClick={onOrderClick} />
        )}
      </div>
    </div>
  );
}
