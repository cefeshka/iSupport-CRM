import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Phone, Mail, TrendingUp, MessageSquare, Plus } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import NewClientModal from './NewClientModal';
import type { Database } from '../../lib/database.types';
import { motion } from 'framer-motion';

type Client = Database['public']['Tables']['clients']['Row'];

interface ClientsListProps {
  onClientClick: (client: Client) => void;
}

export default function ClientsList({ onClientClick }: ClientsListProps) {
  const { currentLocation } = useLocation();
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  useEffect(() => {
    loadClients();
  }, [currentLocation]);

  async function loadClients() {
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentLocation?.id) {
        query = query.or(`location_id.eq.${currentLocation.id},location_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading clients:', error);
      } else if (data) {
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter((client) =>
    client.full_name.toLowerCase().includes(search.toLowerCase()) ||
    client.phone.includes(search)
  );

  const getLoyaltyColor = (level: string) => {
    switch (level) {
      case 'vip': return 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200';
      case 'regular': return 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 border border-primary-200';
      default: return 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getLoyaltyLabel = (level: string) => {
    switch (level) {
      case 'vip': return 'VIP';
      case 'regular': return 'Постоянный';
      default: return 'Новый';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {t('clients.title')}
          </h1>
          <p className="text-slate-600 mt-1">{t('clients.list')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowNewClientModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-glow flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('clients.new')}
        </motion.button>
      </motion.div>

      <div className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('clients.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-soft"
          />
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 overflow-hidden shadow-medium">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('orders.client')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('clients.contacts')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('clients.orders')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('clients.ltv')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('clients.trafficSource')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/40 backdrop-blur-sm divide-y divide-slate-100">
              {filteredClients.map((client, index) => (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  onClick={() => onClientClick(client)}
                  className="hover:bg-primary-50/50 cursor-pointer transition-all"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-medium">
                        {client.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{client.full_name}</div>
                        <div className="text-sm text-slate-500">ID: {client.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{client.phone}</span>
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {client.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getLoyaltyColor(client.loyalty_level)}`}>
                      {getLoyaltyLabel(client.loyalty_level)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <TrendingUp className="w-4 h-4 text-primary-500" />
                      {client.total_orders}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{client.total_spent} ₽</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 font-medium">{client.traffic_source}</div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="py-16 text-center text-slate-500 font-medium">
            {t('clients.noClientsFound')}
          </div>
        )}
      </div>

      {showNewClientModal && (
        <NewClientModal
          onClose={() => setShowNewClientModal(false)}
          onSuccess={() => {
            setShowNewClientModal(false);
            loadClients();
          }}
        />
      )}
    </div>
  );
}
