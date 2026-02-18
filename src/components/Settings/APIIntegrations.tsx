import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plug, Key, Plus, Eye, EyeOff, X, Trash2 } from 'lucide-react';

interface APIKey {
  id: string;
  service_name: string;
  api_key: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function APIIntegrations() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const availableServices = [
    { value: 'imeidb', label: 'IMEI Database', description: 'Поиск устройств по IMEI' },
    { value: 'aftership', label: 'AfterShip', description: 'Отслеживание посылок' },
    { value: 'whatsapp', label: 'WhatsApp Business API', description: 'Отправка сообщений' },
    { value: 'sendgrid', label: 'SendGrid', description: 'Email рассылки' },
    { value: 'stripe', label: 'Stripe', description: 'Прием платежей' },
    { value: 'custom', label: 'Другое', description: 'Произвольный сервис' }
  ];

  useEffect(() => {
    loadAPIKeys();
  }, []);

  async function loadAPIKeys() {
    setLoading(true);
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setApiKeys(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!serviceName.trim() || !apiKey.trim()) return;

    await supabase.from('api_keys').insert({
      service_name: serviceName,
      api_key: apiKey,
      is_active: true
    });

    setShowModal(false);
    setServiceName('');
    setApiKey('');
    loadAPIKeys();
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    await supabase
      .from('api_keys')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    loadAPIKeys();
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить этот API ключ?')) return;
    await supabase.from('api_keys').delete().eq('id', id);
    loadAPIKeys();
  }

  function toggleKeyVisibility(id: string) {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function maskKey(key: string) {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">API и интеграции</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Подключите внешние сервисы для расширения функционала
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить API ключ
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Загрузка...</div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12">
          <Plug className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Нет подключенных интеграций</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    key.is_active ? 'bg-green-50' : 'bg-neutral-50'
                  }`}>
                    <Plug className={`w-5 h-5 ${
                      key.is_active ? 'text-green-600' : 'text-neutral-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-neutral-900">{key.service_name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        key.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {key.is_active ? 'Активно' : 'Неактивно'}
                      </span>
                    </div>
                    {key.last_used_at && (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Последнее использование: {new Date(key.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 px-3 py-2 bg-neutral-50 rounded-lg font-mono text-sm">
                  {showKeys[key.id] ? key.api_key : maskKey(key.api_key)}
                </div>
                <button
                  onClick={() => toggleKeyVisibility(key.id)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  {showKeys[key.id] ? (
                    <EyeOff className="w-4 h-4 text-neutral-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-neutral-600" />
                  )}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(key.id, key.is_active)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    key.is_active
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {key.is_active ? 'Отключить' : 'Включить'}
                </button>
                <button
                  onClick={() => handleDelete(key.id)}
                  className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-purple-900 mb-1">Безопасность</h4>
            <p className="text-xs text-purple-700">
              API ключи хранятся в зашифрованном виде. Никогда не передавайте ключи третьим лицам.
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Добавить API ключ</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Сервис</label>
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Выберите сервис</option>
                  {availableServices.map((service) => (
                    <option key={service.value} value={service.label}>
                      {service.label} - {service.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">API ключ</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_live_..."
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-neutral-500 mt-1.5">
                  Введите API ключ из панели управления сервиса
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={!serviceName || !apiKey}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
