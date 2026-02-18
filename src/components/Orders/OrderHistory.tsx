import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { History, Clock, User, FileText } from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  description: string;
  old_value: any;
  new_value: any;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface OrderHistoryProps {
  orderId: string;
}

export default function OrderHistory({ orderId }: OrderHistoryProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [orderId]);

  async function loadLogs() {
    setLoading(true);

    const { data } = await supabase
      .from('activity_logs')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq('entity_type', 'order')
      .eq('entity_id', orderId)
      .order('created_at', { ascending: false });

    if (data) {
      setLogs(data as any);
    }

    setLoading(false);
  }

  function getActionIcon(actionType: string) {
    switch (actionType) {
      case 'created':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'status_changed':
        return <History className="w-4 h-4 text-blue-600" />;
      case 'updated':
        return <FileText className="w-4 h-4 text-orange-600" />;
      case 'deleted':
        return <FileText className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-600" />;
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Сегодня в ${time}`;
    if (isYesterday) return `Вчера в ${time}`;

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-neutral-500">Загрузка истории...</div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-sm text-neutral-500">История пока пуста</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 pb-3 border-b border-neutral-100 last:border-0">
          <div className="flex-shrink-0 w-8 h-8 bg-neutral-50 rounded-full flex items-center justify-center mt-0.5">
            {getActionIcon(log.action_type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm text-neutral-900">{log.description}</p>
              <span className="text-xs text-neutral-500 flex-shrink-0">
                {formatDate(log.created_at)}
              </span>
            </div>

            {log.profiles && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <User className="w-3 h-3" />
                <span>{log.profiles.full_name}</span>
              </div>
            )}

            {(log.old_value || log.new_value) && (
              <div className="mt-2 text-xs bg-neutral-50 rounded p-2 space-y-1">
                {log.old_value && (
                  <div className="text-neutral-600">
                    <span className="font-medium">Было:</span> {JSON.stringify(log.old_value)}
                  </div>
                )}
                {log.new_value && (
                  <div className="text-neutral-600">
                    <span className="font-medium">Стало:</span> {JSON.stringify(log.new_value)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
