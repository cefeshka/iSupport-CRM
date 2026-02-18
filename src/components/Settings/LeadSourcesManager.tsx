import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import { Target, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface LeadSource {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export default function LeadSourcesManager() {
  const { currentLocation } = useLocation();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSource, setEditingSource] = useState<Partial<LeadSource> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const predefinedColors = [
    '#4285F4', // Google Blue
    '#000000', // TikTok Black
    '#E4405F', // Instagram Pink
    '#1877F2', // Facebook Blue
    '#34C759', // Green
    '#8E8E93', // Gray
    '#FF9500', // Orange
    '#FF3B30', // Red
    '#AF52DE', // Purple
    '#FFD60A'  // Yellow
  ];

  useEffect(() => {
    if (currentLocation) {
      loadSources();
    }
  }, [currentLocation]);

  async function loadSources() {
    if (!currentLocation) return;

    const { data, error } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('sort_order', { ascending: true });

    if (data) {
      setSources(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!currentLocation || !editingSource || !editingSource.name) return;

    const sourceData = {
      ...editingSource,
      location_id: currentLocation.id
    };

    if (editingSource.id) {
      const { error } = await supabase
        .from('lead_sources')
        .update(sourceData)
        .eq('id', editingSource.id);

      if (error) {
        alert('Ошибка при сохранении');
        return;
      }
    } else {
      const { error } = await supabase
        .from('lead_sources')
        .insert([sourceData]);

      if (error) {
        alert('Ошибка при создании');
        return;
      }
    }

    setIsModalOpen(false);
    setEditingSource(null);
    loadSources();
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить этот источник?')) return;

    const { error } = await supabase
      .from('lead_sources')
      .delete()
      .eq('id', id);

    if (!error) {
      loadSources();
    }
  }

  function openCreateModal() {
    setEditingSource({
      name: '',
      color: predefinedColors[0],
      is_active: true,
      sort_order: sources.length
    });
    setIsModalOpen(true);
  }

  function openEditModal(source: LeadSource) {
    setEditingSource(source);
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
            <Target className="w-5 h-5" />
            Источники лидов
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Управление маркетинговыми каналами
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Добавить источник
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((source) => (
          <div
            key={source.id}
            className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: source.color }}
                >
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">{source.name}</h3>
                  {source.is_active ? (
                    <span className="text-xs text-green-600">Активен</span>
                  ) : (
                    <span className="text-xs text-gray-500">Неактивен</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(source)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(source.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-neutral-500">
              Порядок: {source.sort_order}
            </div>
          </div>
        ))}
      </div>

      {sources.length === 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
          <p className="text-neutral-500">Нет источников лидов. Добавьте первый источник.</p>
        </div>
      )}

      {isModalOpen && editingSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                {editingSource.id ? 'Редактировать источник' : 'Новый источник'}
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
                  Название источника
                </label>
                <input
                  type="text"
                  value={editingSource.name}
                  onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Google Ads"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Цвет
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingSource({ ...editingSource, color })}
                      className={`w-full h-10 rounded-lg border-2 transition-all ${
                        editingSource.color === color
                          ? 'border-blue-500 scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={editingSource.color}
                  onChange={(e) => setEditingSource({ ...editingSource, color: e.target.value })}
                  className="mt-2 w-full h-10 rounded-lg border border-neutral-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingSource.sort_order}
                  onChange={(e) => setEditingSource({ ...editingSource, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="source_active"
                  checked={editingSource.is_active}
                  onChange={(e) => setEditingSource({ ...editingSource, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="source_active" className="text-sm text-neutral-700">
                  Источник активен
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
