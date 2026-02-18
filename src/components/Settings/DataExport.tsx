import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import { Download, Database, FileText, Users, Package, DollarSign } from 'lucide-react';

export default function DataExport() {
  const { currentLocation } = useLocation();
  const [exporting, setExporting] = useState(false);

  async function exportData(tableName: string, filename: string) {
    if (!currentLocation) return;

    setExporting(true);
    try {
      let query = supabase.from(tableName).select('*');

      if (tableName !== 'locations') {
        query = query.eq('location_id', currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('Нет данных для экспорта');
        return;
      }

      const csv = convertToCSV(data);
      downloadCSV(csv, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте данных');
    } finally {
      setExporting(false);
    }
  }

  function convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        const escaped = ('' + value).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function exportAllData() {
    if (!currentLocation) return;

    const tables = [
      { name: 'clients', label: 'Клиенты' },
      { name: 'orders', label: 'Заказы' },
      { name: 'order_items', label: 'Позиции заказов' },
      { name: 'inventory', label: 'Склад' },
      { name: 'profiles', label: 'Сотрудники' }
    ];

    for (const table of tables) {
      await exportData(table.name, table.label);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const exportOptions = [
    {
      icon: Users,
      title: 'Клиенты',
      description: 'Экспорт базы клиентов',
      table: 'clients',
      filename: 'clients',
      color: 'blue'
    },
    {
      icon: FileText,
      title: 'Заказы',
      description: 'Экспорт всех заказов',
      table: 'orders',
      filename: 'orders',
      color: 'green'
    },
    {
      icon: Package,
      title: 'Склад',
      description: 'Экспорт складских остатков',
      table: 'inventory',
      filename: 'inventory',
      color: 'orange'
    },
    {
      icon: DollarSign,
      title: 'Финансы',
      description: 'Экспорт финансовых данных',
      table: 'orders',
      filename: 'financial',
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Экспорт данных
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          Выгрузка данных в формате CSV
        </p>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-start gap-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Download className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">Экспорт всех данных</h3>
            <p className="text-sm text-blue-700 mb-3">
              Выгрузите все данные вашей CRM одной кнопкой
            </p>
            <button
              onClick={exportAllData}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Экспорт...' : 'Экспортировать все'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600',
              green: 'bg-green-100 text-green-600',
              orange: 'bg-orange-100 text-orange-600',
              purple: 'bg-purple-100 text-purple-600'
            }[option.color];

            return (
              <div
                key={option.table}
                className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${colorClasses}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">{option.title}</h3>
                <p className="text-sm text-neutral-600 mb-3">{option.description}</p>
                <button
                  onClick={() => exportData(option.table, option.filename)}
                  disabled={exporting}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Экспортировать
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-amber-600 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-amber-900 mb-1">Важная информация</h4>
            <p className="text-sm text-amber-800">
              Экспортированные файлы содержат конфиденциальную информацию.
              Храните их в безопасном месте и не передавайте третьим лицам.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
