import { useState, useEffect } from 'react';
import { Search, User, CheckCircle2, AlertTriangle, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];

interface ClientWithHistory extends Client {
  recentOrders?: {
    id: string;
    order_number: string;
    stage_name: string;
    device_model: string;
    created_at: string;
  }[];
  orderCount?: number;
  totalSpent?: number;
}

interface CustomerRecognitionProps {
  phoneNumber: string;
  onClientSelect: (client: Client) => void;
  onNewClient: () => void;
  disabled?: boolean;
}

export function CustomerRecognition({
  phoneNumber,
  onClientSelect,
  onNewClient,
  disabled = false
}: CustomerRecognitionProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [foundClients, setFoundClients] = useState<ClientWithHistory[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithHistory | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length >= 7) {
      searchClient(cleanPhone);
    } else {
      setFoundClients([]);
      setSelectedClient(null);
      setShowDetails(false);
    }
  }, [phoneNumber]);

  async function searchClient(phone: string) {
    setIsSearching(true);
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .or(`phone.eq.${phone},phone.ilike.%${phone}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (clients && clients.length > 0) {
        const clientsWithHistory = await Promise.all(
          clients.map(async (client) => {
            const [ordersResult, statsResult] = await Promise.all([
              supabase
                .from('orders')
                .select(`
                  id,
                  order_number,
                  device_model,
                  created_at,
                  stage_id,
                  order_stages(name)
                `)
                .eq('client_id', client.id)
                .order('created_at', { ascending: false })
                .limit(3),
              supabase
                .from('orders')
                .select('total_price')
                .eq('client_id', client.id)
            ]);

            const recentOrders = ordersResult.data?.map(order => ({
              id: order.id,
              order_number: order.order_number || 'N/A',
              stage_name: (order.order_stages as any)?.name || 'Unknown',
              device_model: order.device_model || 'Unknown',
              created_at: order.created_at
            })) || [];

            const totalSpent = statsResult.data?.reduce((sum, order) =>
              sum + (order.total_price || 0), 0
            ) || 0;

            return {
              ...client,
              recentOrders,
              orderCount: statsResult.data?.length || 0,
              totalSpent
            };
          })
        );

        setFoundClients(clientsWithHistory);

        if (clientsWithHistory.length === 1) {
          setSelectedClient(clientsWithHistory[0]);
          setShowDetails(true);
        }
      } else {
        setFoundClients([]);
        setSelectedClient(null);
        setShowDetails(false);
      }
    } catch (error) {
      console.error('Client search error:', error);
    } finally {
      setIsSearching(false);
    }
  }

  function handleLoadClient(client: ClientWithHistory) {
    setSelectedClient(client);
    onClientSelect(client);
  }

  function getClientStatus(client: ClientWithHistory) {
    if (client.is_vip) return { label: 'VIP', color: 'text-yellow-600 bg-yellow-50', icon: Star };
    if (client.notes?.toLowerCase().includes('bad') || client.notes?.toLowerCase().includes('problem')) {
      return { label: 'Uzmanību', color: 'text-red-600 bg-red-50', icon: AlertTriangle };
    }
    if ((client.orderCount || 0) >= 5) {
      return { label: 'Lojāls', color: 'text-green-600 bg-green-50', icon: TrendingUp };
    }
    return null;
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) {
    return null;
  }

  if (isSearching) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-blue-700">Meklē klientu...</span>
      </div>
    );
  }

  if (foundClients.length === 0) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Jauns klients</span>
        </div>
        <button
          type="button"
          onClick={onNewClient}
          disabled={disabled}
          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
        >
          Turpināt kā jaunu
        </button>
      </div>
    );
  }

  if (foundClients.length > 1) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            Atrasti {foundClients.length} klienti ar šo tālruni
          </span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {foundClients.map((client) => {
            const status = getClientStatus(client);
            return (
              <div
                key={client.id}
                className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                onClick={() => handleLoadClient(client)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{client.full_name}</div>
                    <div className="text-sm text-gray-500">{client.email || 'Nav e-pasta'}</div>
                  </div>
                  {status && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      <status.icon className="w-3 h-3" />
                      {status.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {client.orderCount || 0} pasūtījumi · €{(client.totalSpent || 0).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const client = foundClients[0];
  const status = getClientStatus(client);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-green-900">Klients atrasts:</span>
            <span className="font-semibold text-green-900">{client.full_name}</span>
            {status && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                <status.icon className="w-3 h-3" />
                {status.label}
              </span>
            )}
          </div>

          <div className="text-sm text-green-700 space-y-1">
            <div>{client.email || 'Nav e-pasta'}</div>
            <div className="flex items-center gap-3 text-xs">
              <span>{client.orderCount || 0} pasūtījumi</span>
              <span>·</span>
              <span>Kopā iztērēts: €{(client.totalSpent || 0).toFixed(2)}</span>
            </div>
          </div>

          {client.notes && (
            <div className="mt-2 p-2 bg-white rounded border border-green-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Piezīmes:</div>
              <div className="text-xs text-gray-600">{client.notes}</div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleLoadClient(client)}
            disabled={disabled}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
          >
            Ielādēt datus
          </button>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 text-sm font-medium text-green-600 bg-white border border-green-300 rounded-lg hover:bg-green-50 whitespace-nowrap"
          >
            {showDetails ? 'Paslēpt' : 'Vēsture'}
          </button>
        </div>
      </div>

      {showDetails && client.recentOrders && client.recentOrders.length > 0 && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Pēdējie 3 pasūtījumi</h4>
          <div className="space-y-2">
            {client.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">#{order.order_number}</div>
                  <div className="text-gray-600">{order.device_model}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-blue-600">{order.stage_name}</div>
                  <div className="text-gray-500">{formatDate(order.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
