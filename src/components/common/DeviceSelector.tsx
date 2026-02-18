import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, ChevronDown, Plus, Check } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  brand_id: string;
  name: string;
}

interface DeviceSelectorProps {
  selectedBrandId: string;
  selectedModelId: string;
  onBrandChange: (brandId: string, brandName: string) => void;
  onModelChange: (modelId: string, modelName: string) => void;
  disabled?: boolean;
}

export default function DeviceSelector({
  selectedBrandId,
  selectedModelId,
  onBrandChange,
  onModelChange,
  disabled = false
}: DeviceSelectorProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);

  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showNewBrandModal, setShowNewBrandModal] = useState(false);
  const [showNewModelModal, setShowNewModelModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');

  const brandRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadModels(selectedBrandId);
    } else {
      setModels([]);
      setFilteredModels([]);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    const filtered = brands.filter(brand =>
      brand.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
    setFilteredBrands(filtered);
  }, [brandSearch, brands]);

  useEffect(() => {
    const filtered = models.filter(model =>
      model.name.toLowerCase().includes(modelSearch.toLowerCase())
    );
    setFilteredModels(filtered);
  }, [modelSearch, models]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadBrands() {
    const { data } = await supabase
      .from('device_brands')
      .select('*')
      .order('name');

    if (data) {
      setBrands(data);
      setFilteredBrands(data);
    }
  }

  async function loadModels(brandId: string) {
    const { data } = await supabase
      .from('device_models')
      .select('*')
      .eq('brand_id', brandId)
      .order('name');

    if (data) {
      setModels(data);
      setFilteredModels(data);
    }
  }

  async function handleAddBrand() {
    if (!newBrandName.trim()) return;

    const { data, error } = await supabase
      .from('device_brands')
      .insert({ name: newBrandName.trim() })
      .select()
      .single();

    if (!error && data) {
      await loadBrands();
      onBrandChange(data.id, data.name);
      setBrandSearch(data.name);
      setNewBrandName('');
      setShowNewBrandModal(false);
      setShowBrandDropdown(false);
    }
  }

  async function handleAddModel() {
    if (!newModelName.trim() || !selectedBrandId) return;

    const { data, error } = await supabase
      .from('device_models')
      .insert({ brand_id: selectedBrandId, name: newModelName.trim() })
      .select()
      .single();

    if (!error && data) {
      await loadModels(selectedBrandId);
      onModelChange(data.id, data.name);
      setModelSearch(data.name);
      setNewModelName('');
      setShowNewModelModal(false);
      setShowModelDropdown(false);
    }
  }

  function selectBrand(brand: Brand) {
    onBrandChange(brand.id, brand.name);
    setBrandSearch(brand.name);
    setShowBrandDropdown(false);
    setModelSearch('');
    onModelChange('', '');
  }

  function selectModel(model: Model) {
    onModelChange(model.id, model.name);
    setModelSearch(model.name);
    setShowModelDropdown(false);
  }

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div ref={brandRef} className="relative">
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Бренд *
        </label>
        <div className="relative">
          <input
            type="text"
            value={brandSearch || selectedBrand?.name || ''}
            onChange={(e) => {
              setBrandSearch(e.target.value);
              setShowBrandDropdown(true);
            }}
            onFocus={() => setShowBrandDropdown(true)}
            placeholder="Поиск бренда..."
            disabled={disabled}
            className="w-full px-3 py-2 pr-8 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-50"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        </div>

        {showBrandDropdown && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredBrands.length > 0 ? (
              filteredBrands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => selectBrand(brand)}
                  className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between group"
                >
                  <span className="text-sm text-neutral-900">{brand.name}</span>
                  {selectedBrandId === brand.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-neutral-500">
                Не найдено
              </div>
            )}

            {brandSearch && filteredBrands.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setNewBrandName(brandSearch);
                  setShowNewBrandModal(true);
                  setShowBrandDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 border-t border-neutral-200 text-blue-600"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Добавить "{brandSearch}"</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div ref={modelRef} className="relative">
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Модель *
        </label>
        <div className="relative">
          <input
            type="text"
            value={modelSearch || selectedModel?.name || ''}
            onChange={(e) => {
              setModelSearch(e.target.value);
              setShowModelDropdown(true);
            }}
            onFocus={() => setShowModelDropdown(true)}
            placeholder={selectedBrandId ? "Поиск модели..." : "Сначала выберите бренд"}
            disabled={disabled || !selectedBrandId}
            className="w-full px-3 py-2 pr-8 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-50"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        </div>

        {showModelDropdown && !disabled && selectedBrandId && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredModels.length > 0 ? (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => selectModel(model)}
                  className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between group"
                >
                  <span className="text-sm text-neutral-900">{model.name}</span>
                  {selectedModelId === model.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-neutral-500">
                Не найдено
              </div>
            )}

            {modelSearch && filteredModels.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setNewModelName(modelSearch);
                  setShowNewModelModal(true);
                  setShowModelDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 border-t border-neutral-200 text-blue-600"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Добавить "{modelSearch}"</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showNewBrandModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Добавить новый бренд</h3>
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Название бренда"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewBrandModal(false)}
                className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddBrand}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewModelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Добавить новую модель</h3>
            <p className="text-sm text-neutral-600 mb-3">
              Бренд: <span className="font-medium">{selectedBrand?.name}</span>
            </p>
            <input
              type="text"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="Название модели"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewModelModal(false)}
                className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddModel}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
