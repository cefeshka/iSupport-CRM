import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  cost: number;
  duration_minutes: number;
  warranty_months: number;
}

interface ServiceSearchProps {
  onServiceSelect: (service: Service) => void;
  className?: string;
  placeholder?: string;
}

export default function ServiceSearch({
  onServiceSelect,
  className = '',
  placeholder = 'Поиск услуг...'
}: ServiceSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredServices([]);
      setShowDropdown(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = services.filter(service =>
      service.name.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query) ||
      service.category.toLowerCase().includes(query)
    );

    setFilteredServices(filtered);
    setShowDropdown(filtered.length > 0);
  }, [searchQuery, services]);

  async function loadServices() {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data && !error) {
      setServices(data);
    }
    setLoading(false);
  }

  function handleServiceClick(service: Service) {
    onServiceSelect(service);
    setSearchQuery('');
    setShowDropdown(false);
  }

  function getCategoryLabel(category: string) {
    const labels: Record<string, string> = {
      repair: 'Ремонт',
      diagnostics: 'Диагностика',
      software: 'ПО',
      replacement: 'Замена'
    };
    return labels[category] || category;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        Услуги
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setShowDropdown(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && filteredServices.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
          {filteredServices.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => handleServiceClick(service)}
              className="w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-neutral-900">{service.name}</div>
                  {service.description && (
                    <div className="text-sm text-neutral-500 mt-0.5">{service.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                      {getCategoryLabel(service.category)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {service.duration_minutes} мин
                    </span>
                    {service.warranty_months > 0 && (
                      <span className="text-xs text-neutral-500">
                        Гарантия: {service.warranty_months} мес
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && filteredServices.length === 0 && searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg p-4 z-50">
          <div className="text-sm text-neutral-500 text-center">
            Услуги не найдены
          </div>
        </div>
      )}
    </div>
  );
}
