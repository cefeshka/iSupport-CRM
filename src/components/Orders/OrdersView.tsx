import { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import OrdersKanban from './OrdersKanban';
import OrdersTable from './OrdersTable';
import type { Database } from '../../lib/database.types';
import { motion } from 'framer-motion';

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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-6 py-5 shadow-soft"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Заказы
            </h1>
            <p className="text-sm text-slate-600 mt-1">Управление заказами и ремонтами</p>
          </div>

          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-soft border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">Канбан</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">Таблица</span>
            </button>
          </div>
        </div>
      </motion.div>

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
