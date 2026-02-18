import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import { Wrench, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface Service {
  id: string;
  category: string;
  name: string;
  description: string;
  standard_price: number;
  duration_minutes: number;
  is_active: boolean;
}

export default function ServiceCatalogManager() {
  const { currentLocation } = useLocation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categories = ['iPhone', 'Samsung', 'Xiaomi', 'Laptop', 'Tablet', 'Другое'];

  useEffect(() => {
    if (currentLocation) {
      loadServices();
    }
  }, [currentLocation]);

  async function loadServices() {
    if (!currentLocation) return;

    const { data, error } = await supabase
      .from('service_catalog')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (data) {
      setServices(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!currentLocation || !editingService) return;

    const serviceData = {
      ...editingService,
      location_id: currentLocation.id
    };

    if (editingService.id) {
      const { error } = await supabase
        .from('service_catalog')
        .update(serviceData)
        .eq('id', editingService.id);

      if (error) {
        alert('Ошибка при сохранении');
        return;
      }
    } else {
      const { error } = await supabase
        .from('service_catalog')
        .insert([serviceData]);

      if (error) {
        alert('Ошибка при создании');
        return;
      }
    }

    setIsModalOpen(false);
    setEditingService(null);
    loadServices();
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить эту услугу?')) return;

    const { error } = await supabase
      .from('service_catalog')
      .delete()
      .eq('id', id);

    if (!error) {
      loadServices();
    }
  }

  function openCreateModal() {
    setEditingService({
      category: 'iPhone',
      name: '',
      description: '',
      standard_price: 0,
      duration_minutes: 30,
      is_active: true
    });
    setIsModalOpen(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);
    setIsModalOpen(true);
  }

  if (loading) {
    return <div className="text-center py-8 text-neutral-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Справочник услуг
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Управление каталогом услуг и ремонтов
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Добавить услугу
        </button>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Категория</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Название</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Описание</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700">Цена</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-700">Время (мин)</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-700">Статус</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm text-neutral-900">{service.category}</td>
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{service.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{service.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-900">€{service.standard_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-center text-neutral-700">{service.duration_minutes}</td>
                  <td className="px-4 py-3 text-center">
                    {service.is_active ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Активна
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Неактивна
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(service)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-500">
                    Нет услуг в каталоге. Добавьте первую услугу.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                {editingService.id ? 'Редактировать услугу' : 'Новая услуга'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Категория
                </label>
                <select
                  value={editingService.category}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Название услуги
                </label>
                <input
                  type="text"
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Замена экрана"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Краткое описание услуги"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Стандартная цена (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingService.standard_price}
                    onChange={(e) => setEditingService({ ...editingService, standard_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Время выполнения (мин)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingService.duration_minutes}
                    onChange={(e) => setEditingService({ ...editingService, duration_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingService.is_active}
                  onChange={(e) => setEditingService({ ...editingService, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-neutral-700">
                  Услуга активна
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-neutral-700"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
