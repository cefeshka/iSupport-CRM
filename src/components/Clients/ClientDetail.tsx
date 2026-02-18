import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Phone, Mail, MapPin, MessageSquare, Clock } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type Communication = Database['public']['Tables']['communications']['Row'];

interface ClientDetailProps {
  client: Client;
  onClose: () => void;
}

export default function ClientDetail({ client, onClose }: ClientDetailProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);

  useEffect(() => {
    loadClientData();
  }, [client.id]);

  async function loadClientData() {
    const [ordersRes, commsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('communications')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
    ]);

    if (ordersRes.data) setOrders(ordersRes.data);
    if (commsRes.data) setCommunications(commsRes.data);
  }

  const getChannelIcon = (channel: string) => {
    return <MessageSquare className="w-4 h-4" />;
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
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-medium">
              {client.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">{client.full_name}</h2>
              <p className="text-sm text-neutral-500">Клиент с {new Date(client.created_at).toLocaleDateString('ru-RU')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-xl p-4">
              <h3 className="font-medium text-neutral-900 mb-3">Контактная информация</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-900">{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-900">{client.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-900">{client.traffic_source}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4">
              <h3 className="font-medium text-neutral-900 mb-3">Статистика</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Всего заказов</span>
                  <span className="font-medium text-neutral-900">{orders.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Общая сумма</span>
                  <span className="font-medium text-neutral-900">{client.total_spent} ₽</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Средний чек</span>
                  <span className="font-medium text-neutral-900">
                    {orders.length > 0 ? Math.round(client.total_spent / orders.length) : 0} ₽
                  </span>
                </div>
              </div>
            </div>
          </div>

          {client.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-medium text-amber-900 mb-2">Заметки</h3>
              <p className="text-sm text-amber-700">{client.notes}</p>
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <h3 className="font-medium text-neutral-900 mb-4">История заказов</h3>
            <div className="space-y-3">
              {orders.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">Нет заказов</p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900 text-sm">
                        {order.device_type} {order.device_model}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-neutral-900">
                        {order.final_cost || order.estimated_cost} ₽
                      </div>
                      {order.is_paid ? (
                        <div className="text-xs text-green-600">Оплачено</div>
                      ) : (
                        <div className="text-xs text-amber-600">Не оплачено</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <h3 className="font-medium text-neutral-900 mb-4">История коммуникаций</h3>
            <div className="space-y-3">
              {communications.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">Нет сообщений</p>
              ) : (
                communications.map((comm) => (
                  <div key={comm.id} className="flex gap-3 py-2">
                    <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {getChannelIcon(comm.channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-neutral-500 uppercase">{comm.channel}</span>
                        <span className="text-xs text-neutral-400">
                          {comm.direction === 'outbound' ? 'Исходящее' : 'Входящее'}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-900">{comm.message}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                        <Clock className="w-3 h-3" />
                        {new Date(comm.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
