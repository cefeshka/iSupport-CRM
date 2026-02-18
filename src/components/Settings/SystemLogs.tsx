import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Filter, Calendar, User, FileText, Package, Users, Settings as SettingsIcon, DollarSign } from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  description: string;
  created_at: string;
  profiles: {
    full_name: string;
    role: string;
  };
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [filterActionType, setFilterActionType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('today');

  useEffect(() => {
    loadLogs();
  }, [filterEntityType, filterActionType, filterDate]);

  async function loadLogs() {
    setLoading(true);

    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        profiles (
          full_name,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterEntityType !== 'all') {
      query = query.eq('entity_type', filterEntityType);
    }

    if (filterActionType !== 'all') {
      query = query.eq('action_type', filterActionType);
    }

    if (filterDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    } else if (filterDate === 'week') {
      const week = new Date();
      week.setDate(week.getDate() - 7);
      query = query.gte('created_at', week.toISOString());
    } else if (filterDate === 'month') {
      const month = new Date();
      month.setMonth(month.getMonth() - 1);
      query = query.gte('created_at', month.toISOString());
    }

    const { data } = await query;

    if (data) {
      setLogs(data as any);
    }

    setLoading(false);
  }

  function getEntityIcon(entityType: string) {
    switch (entityType) {
      case 'order':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-green-600" />;
      case 'client':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'finance':
        return <DollarSign className="w-4 h-4 text-yellow-600" />;
      case 'settings':
        return <SettingsIcon className="w-4 h-4 text-neutral-600" />;
      default:
        return <Activity className="w-4 h-4 text-neutral-600" />;
    }
  }

  function getActionColor(actionType: string) {
    switch (actionType) {
      case 'created':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'updated':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'deleted':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'status_changed':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const entityTypes = [
    { value: 'all', label: 'Все типы' },
    { value: 'order', label: 'Заказы' },
    { value: 'inventory', label: 'Склад' },
    { value: 'client', label: 'Клиенты' },
    { value: 'finance', label: 'Финансы' },
    { value: 'settings', label: 'Настройки' }
  ];

  const actionTypes = [
    { value: 'all', label: 'Все действия' },
    { value: 'created', label: 'Создание' },
    { value: 'updated', label: 'Обновление' },
    { value: 'deleted', label: 'Удаление' },
    { value: 'status_changed', label: 'Смена статуса' }
  ];

  const dateFilters = [
    { value: 'today', label: 'Сегодня' },
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'all', label: 'Всё время' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Журнал активности системы
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          История всех действий сотрудников в системе
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-500" />
          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {entityTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <select
          value={filterActionType}
          onChange={(e) => setFilterActionType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {actionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-500" />
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dateFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadLogs}
          className="ml-auto px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Загрузка...</div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Время
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Действие
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Описание
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                      Нет записей для отображения
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-neutral-400" />
                          <div>
                            <div className="text-sm font-medium text-neutral-900">
                              {log.profiles?.full_name || 'Неизвестно'}
                            </div>
                            {log.profiles?.role && (
                              <div className="text-xs text-neutral-500">
                                {log.profiles.role}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getEntityIcon(log.entity_type)}
                          <span className="text-sm text-neutral-700 capitalize">
                            {log.entity_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getActionColor(log.action_type)}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {log.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Информация</h4>
            <p className="text-xs text-blue-700">
              Журнал хранит последние 100 записей. Для полного аудита используйте экспорт данных.
              Логи автоматически создаются при изменении статусов заказов и других критичных операциях.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
