import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Save } from 'lucide-react';

interface SystemSetting {
  key: string;
  value: any;
  category: string;
  description: string | null;
}

export default function FinanceSettings() {
  const [currency, setCurrency] = useState('EUR');
  const [vatRate, setVatRate] = useState(21);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [cashBalance, setCashBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['currency', 'vat_rate', 'cash_balance']);

    if (data) {
      data.forEach((setting) => {
        if (setting.key === 'currency') {
          setCurrency(setting.value.code || 'EUR');
        } else if (setting.key === 'vat_rate') {
          setVatRate(setting.value.rate || 21);
          setVatEnabled(setting.value.enabled !== false);
        } else if (setting.key === 'cash_balance') {
          setCashBalance(setting.value.amount || 0);
        }
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);

    const updates = [
      {
        key: 'currency',
        value: { code: currency, symbol: currency === 'EUR' ? '€' : '$' },
        category: 'finance',
        description: 'Системная валюта'
      },
      {
        key: 'vat_rate',
        value: { rate: vatRate, enabled: vatEnabled },
        category: 'finance',
        description: 'Ставка НДС в процентах'
      },
      {
        key: 'cash_balance',
        value: { amount: cashBalance },
        category: 'finance',
        description: 'Начальный баланс кассы'
      }
    ];

    for (const update of updates) {
      await supabase
        .from('system_settings')
        .upsert({
          ...update,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    }

    setSaving(false);
    alert('Настройки сохранены');
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900">Финансовые настройки</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Управление валютой, налогами и балансом кассы
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Загрузка...</div>
      ) : (
        <div className="space-y-6">
          <div className="border border-neutral-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Валюта
            </h3>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Основная валюта системы
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EUR">EUR (€) - Евро</option>
                <option value="USD">USD ($) - Доллар США</option>
                <option value="GBP">GBP (£) - Фунт стерлингов</option>
                <option value="RUB">RUB (₽) - Российский рубль</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1.5">
                Все финансовые операции будут отображаться в выбранной валюте
              </p>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">
              НДС (налог на добавленную стоимость)
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-neutral-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700">Включить расчет НДС</span>
              </label>

              {vatEnabled && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Ставка НДС (%)
                  </label>
                  <input
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-neutral-500 mt-1.5">
                    Стандартная ставка НДС в ЕС: 21%
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border border-neutral-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">
              Баланс кассы
            </h3>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Начальный баланс ({currency === 'EUR' ? '€' : '$'})
              </label>
              <input
                type="number"
                value={cashBalance}
                onChange={(e) => setCashBalance(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-neutral-500 mt-1.5">
                Установите начальную сумму в кассе для корректного учета
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="text-sm font-medium text-green-900 mb-1">Расчет с НДС</h4>
        <p className="text-xs text-green-700">
          {vatEnabled
            ? `НДС ${vatRate}% будет автоматически добавляться к итоговой стоимости услуг.`
            : 'НДС отключен. Все цены будут отображаться без учета налогов.'}
        </p>
      </div>
    </div>
  );
}
