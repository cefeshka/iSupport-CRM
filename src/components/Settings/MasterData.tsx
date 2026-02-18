import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { List, Plus, Edit, Trash2, ArrowLeft, X, GripVertical } from 'lucide-react';

type MasterDataType = 'order_stages' | 'repair_types' | 'services' | 'traffic_sources';

interface OrderStage {
  id: string;
  name: string;
  position: number;
  color: string | null;
}

interface RepairType {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  cost: number;
  duration_minutes: number;
  warranty_months: number;
  is_active: boolean;
}

interface TrafficSource {
  id: string;
  name: string;
  total_clients: number;
  total_revenue: number;
}

export default function MasterData() {
  const [selectedType, setSelectedType] = useState<MasterDataType | null>(null);

  const dataTypes = [
    { id: 'order_stages' as MasterDataType, name: 'Статусы заказов', description: 'Новый, В работе, Готов', icon: List },
    { id: 'repair_types' as MasterDataType, name: 'Типы ремонтов', description: 'Замена экрана, ремонт платы', icon: List },
    { id: 'services' as MasterDataType, name: 'Услуги', description: 'База услуг для заказов', icon: List },
    { id: 'traffic_sources' as MasterDataType, name: 'Источники трафика', description: 'Instagram, Google, Реклама', icon: List },
  ];

  if (selectedType === 'order_stages') {
    return <OrderStagesManager onBack={() => setSelectedType(null)} />;
  }

  if (selectedType === 'services') {
    return <ServicesManager onBack={() => setSelectedType(null)} />;
  }

  if (selectedType === 'traffic_sources') {
    return <TrafficSourcesManager onBack={() => setSelectedType(null)} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900">Справочники</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Управляйте списками для заказов и клиентов
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataTypes.map((type) => {
          const Icon = type.icon;
          return (
            <div
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-neutral-600" />
                  <h3 className="text-sm font-semibold text-neutral-900">{type.name}</h3>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mb-3">{type.description}</p>
              <button className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                Редактировать список
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderStagesManager({ onBack }: { onBack: () => void }) {
  const [stages, setStages] = useState<OrderStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState<OrderStage | null>(null);
  const [stageName, setStageName] = useState('');
  const [stageColor, setStageColor] = useState('blue');

  const colors = [
    { value: 'blue', label: 'Синий', class: 'bg-blue-500' },
    { value: 'yellow', label: 'Желтый', class: 'bg-yellow-500' },
    { value: 'orange', label: 'Оранжевый', class: 'bg-orange-500' },
    { value: 'red', label: 'Красный', class: 'bg-red-500' },
    { value: 'purple', label: 'Фиолетовый', class: 'bg-purple-500' },
    { value: 'green', label: 'Зеленый', class: 'bg-green-500' },
    { value: 'gray', label: 'Серый', class: 'bg-gray-500' },
  ];

  useEffect(() => {
    loadStages();
  }, []);

  async function loadStages() {
    setLoading(true);
    const { data } = await supabase
      .from('order_stages')
      .select('*')
      .order('position');
    if (data) setStages(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!stageName.trim()) return;

    if (editingStage) {
      await supabase
        .from('order_stages')
        .update({ name: stageName.trim(), color: stageColor })
        .eq('id', editingStage.id);
    } else {
      const maxPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position)) : 0;
      await supabase
        .from('order_stages')
        .insert({ name: stageName.trim(), position: maxPosition + 1, color: stageColor });
    }

    setShowModal(false);
    setEditingStage(null);
    setStageName('');
    setStageColor('blue');
    loadStages();
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить этот статус?')) return;
    await supabase.from('order_stages').delete().eq('id', id);
    loadStages();
  }

  function openEditModal(stage: OrderStage) {
    setEditingStage(stage);
    setStageName(stage.name);
    setStageColor(stage.color || 'blue');
    setShowModal(true);
  }

  const getColorClass = (color: string) => {
    const map: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700',
      purple: 'bg-purple-100 text-purple-700',
      green: 'bg-green-100 text-green-700',
      gray: 'bg-gray-100 text-gray-700'
    };
    return map[color] || map.blue;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-neutral-900">Статусы заказов</h2>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Новый статус
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center gap-3 p-4 border rounded-lg">
              <GripVertical className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-500 min-w-[24px]">{index + 1}</span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getColorClass(stage.color || 'blue')}`}>
                {stage.name}
              </span>
              <div className="ml-auto flex gap-2">
                <button onClick={() => openEditModal(stage)} className="p-2 hover:bg-neutral-100 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(stage.id)} className="p-2 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingStage ? 'Редактировать статус' : 'Новый статус'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Название</label>
                <input
                  type="text"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Цвет</label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setStageColor(color.value)}
                      className={`p-2 rounded border-2 ${stageColor === color.value ? 'border-blue-500' : 'border-neutral-200'}`}
                    >
                      <div className={`w-full h-6 rounded ${color.class}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg">
                  Отмена
                </button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">
                  {editingStage ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServicesManager({ onBack }: { onBack: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    const { data } = await supabase.from('services').select('*').order('name');
    if (data) setServices(data);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-neutral-900">Услуги</h2>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Новая услуга
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">{service.name}</h3>
                <div className="text-sm text-neutral-500 mt-1">
                  ${service.price} • {service.duration_minutes} мин • Гарантия: {service.warranty_months} мес
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-neutral-100 rounded">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrafficSourcesManager({ onBack }: { onBack: () => void }) {
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    const { data } = await supabase.from('traffic_sources').select('*').order('name');
    if (data) setSources(data);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-neutral-900">Источники трафика</h2>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((source) => (
            <div key={source.id} className="p-4 border rounded-lg">
              <h3 className="font-medium">{source.name}</h3>
              <div className="text-sm text-neutral-500 mt-2">
                Клиентов: {source.total_clients} • Доход: ${source.total_revenue}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
