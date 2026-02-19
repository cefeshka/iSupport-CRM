import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Phone, Mail, TrendingUp, MessageSquare, Plus } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import NewClientModal from './NewClientModal';
import type { Database } from '../../lib/database.types';

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
      case 'vip': return 'bg-amber-100 text-amber-700';
      case 'regular': return 'bg-blue-100 text-blue-700';
      default: return 'bg-neutral-100 text-neutral-700';
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
        <div className="text-neutral-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t('clients.title')}</h1>
          <p className="text-neutral-500 mt-1">{t('clients.list')}</p>
        </div>
        <button
          onClick={() => setShowNewClientModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('clients.new')}
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('clients.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('orders.client')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('clients.contacts')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('clients.orders')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('clients.ltv')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('clients.trafficSource')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => onClientClick(client)}
                  className="hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {client.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-900">{client.full_name}</div>
                        <div className="text-sm text-neutral-500">ID: {client.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Phone className="w-4 h-4 text-neutral-400" />
                        {client.phone}
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <Mail className="w-4 h-4 text-neutral-400" />
                          {client.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLoyaltyColor(client.loyalty_level)}`}>
                      {getLoyaltyLabel(client.loyalty_level)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-900">
                      <TrendingUp className="w-4 h-4 text-neutral-400" />
                      {client.total_orders}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-900">{client.total_spent} ₽</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-neutral-600">{client.traffic_source}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="py-12 text-center text-neutral-500">
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
