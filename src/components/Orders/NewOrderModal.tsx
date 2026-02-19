import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { toast, handleSupabaseError } from '../../lib/toast';
import { SmartDeviceInput } from '../common/SmartDeviceInput';
import { ColorPicker } from '../common/ColorPicker';
import { CustomerRecognition } from '../common/CustomerRecognition';
import ServiceSearch from '../common/ServiceSearch';
import InventorySearch from '../common/InventorySearch';
import InputNumber from '../common/InputNumber';
import type { Database } from '../../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];
type OrderStage = Database['public']['Tables']['order_stages']['Row'];
type InventoryItem = Database['public']['Tables']['inventory']['Row'];

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

interface SelectedService extends Service {
  quantity: number;
  warranty_months: number;
}

interface SelectedInventoryItem extends InventoryItem {
  quantity: number;
  selling_price: number;
}

interface NewOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewOrderModal({ onClose, onSuccess }: NewOrderModalProps) {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [stages, setStages] = useState<OrderStage[]>([]);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  const [selectedClient, setSelectedClient] = useState('');
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceColor, setDeviceColor] = useState('');
  const [deviceIMEI, setDeviceIMEI] = useState('');
  const [deviceSerialNumber, setDeviceSerialNumber] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedInventoryItem[]>([]);
  const [prepayment, setPrepayment] = useState<number>(0);
  const [waitingForParts, setWaitingForParts] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientSource, setNewClientSource] = useState('direct');
  const [recognizedClient, setRecognizedClient] = useState<Client | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const firstInputRef = useRef<HTMLSelectElement | HTMLInputElement>(null);
  const servicePriceRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    loadData();
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    const hasData = selectedClient || newClientPhone || deviceBrand || deviceModel || selectedServices.length > 0 || selectedParts.length > 0;
    setHasUnsavedChanges(hasData);
  }, [selectedClient, newClientPhone, deviceBrand, deviceModel, selectedServices, selectedParts]);

  async function loadData() {
    const [clientsRes, stagesRes] = await Promise.all([
      supabase.from('clients').select('*').order('full_name'),
      supabase.from('order_stages').select('*').order('position')
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (stagesRes.data) setStages(stagesRes.data);
  }

  function handleDeviceDetected(info: { brand: string; model: string; color?: string; source?: string } | null) {
    if (info) {
      if (info.brand) setDeviceBrand(info.brand);
      if (info.model) setDeviceModel(info.model);
      if (info.color) setDeviceColor(info.color);
    }
  }

  function handleClientSelect(client: Client) {
    setRecognizedClient(client);
    setSelectedClient(client.id);
    setNewClientName(client.full_name);
    setNewClientEmail(client.email || '');
    setNewClientPhone(client.phone);
    setNewClientSource(client.traffic_source || 'direct');
    setShowNewClientForm(false);
  }

  function handleNewClient() {
    setRecognizedClient(null);
    setShowNewClientForm(true);
    setSelectedClient('');
  }

  function handleServiceSelect(service: Service) {
    const existingService = selectedServices.find(s => s.id === service.id);
    if (existingService) {
      updateServiceQuantity(service.id, existingService.quantity + 1);
      return;
    }

    const newService: SelectedService = {
      ...service,
      price: 0,
      quantity: 1,
      warranty_months: service.warranty_months
    };

    setSelectedServices([...selectedServices, newService]);

    setTimeout(() => {
      servicePriceRefs.current[service.id]?.focus();
      servicePriceRefs.current[service.id]?.select();
    }, 100);

    if (!dueDate && service.duration_minutes > 0) {
      const estimatedDate = new Date();
      estimatedDate.setMinutes(estimatedDate.getMinutes() + service.duration_minutes);
      setDueDate(estimatedDate.toISOString().split('T')[0]);
    }
  }

  function updateServiceQuantity(serviceId: string, quantity: number) {
    setSelectedServices(services =>
      services.map(s => s.id === serviceId ? { ...s, quantity } : s)
    );
  }

  function updateServiceWarranty(serviceId: string, warranty_months: number) {
    setSelectedServices(services =>
      services.map(s => s.id === serviceId ? { ...s, warranty_months } : s)
    );
  }

  function updateServicePrice(serviceId: string, price: number) {
    setSelectedServices(services =>
      services.map(s => s.id === serviceId ? { ...s, price } : s)
    );
  }

  function removeService(serviceId: string) {
    setSelectedServices(services => services.filter(s => s.id !== serviceId));
  }

  function handleInventorySelect(item: InventoryItem) {
    const existingPart = selectedParts.find(p => p.id === item.id);
    if (existingPart) {
      updatePartQuantity(item.id, existingPart.quantity + 1);
      return;
    }

    const newPart: SelectedInventoryItem = {
      ...item,
      quantity: 1,
      selling_price: (item.unit_cost || 0) * 1.5
    };

    setSelectedParts([...selectedParts, newPart]);
  }

  function updatePartQuantity(partId: string, quantity: number) {
    setSelectedParts(parts =>
      parts.map(p => p.id === partId ? { ...p, quantity } : p)
    );
  }

  function updatePartPrice(partId: string, selling_price: number) {
    setSelectedParts(parts =>
      parts.map(p => p.id === partId ? { ...p, selling_price } : p)
    );
  }

  function removePart(partId: string) {
    setSelectedParts(parts => parts.filter(p => p.id !== partId));
  }

  function handleRequestPart(partName: string) {
    setWaitingForParts(true);
    alert(`Запрос на заказ детали "${partName}" будет создан. Заказ будет помечен как "Ожидает деталь".`);
  }

  function calculateTotal() {
    const servicesTotal = selectedServices.reduce((sum, service) => {
      return sum + (service.price * service.quantity);
    }, 0);

    const partsTotal = selectedParts.reduce((sum, part) => {
      return sum + (part.selling_price * part.quantity);
    }, 0);

    return servicesTotal + partsTotal;
  }

  function calculateEstimatedDuration() {
    return selectedServices.reduce((sum, service) => {
      return sum + (service.duration_minutes * service.quantity);
    }, 0);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      if (hasUnsavedChanges) {
        if (confirm('Уйти без сохранения? Все изменения будут потеряны.')) {
          onClose();
        }
      } else {
        onClose();
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (showNewClientForm && !recognizedClient) {
      if (!newClientName.trim()) {
        toast.error('Klienta vārds ir obligāts');
        return;
      }
      if (!newClientPhone.trim() || newClientPhone.length < 5) {
        toast.error('Derīgs tālruņa numurs ir obligāts');
        return;
      }
    } else if (!showNewClientForm && !selectedClient) {
      toast.error('Lūdzu izvēlieties klientu');
      return;
    }

    if (!deviceBrand || !deviceModel) {
      toast.error('Device brand and model are required');
      return;
    }

    if (!deviceColor) {
      toast.error('Device color is required');
      return;
    }

    if (!issueDescription.trim()) {
      toast.error('Issue description is required');
      return;
    }

    // Validate service prices if services are selected
    if (selectedServices.length > 0) {
      const invalidService = selectedServices.find(s => s.price <= 0);
      if (invalidService) {
        toast.error(`Price for "${invalidService.name}" must be greater than 0`);
        return;
      }
    }

    // Validate part prices if parts are selected
    if (selectedParts.length > 0) {
      const invalidPart = selectedParts.find(p => p.selling_price <= 0);
      if (invalidPart) {
        toast.error(`Price for "${invalidPart.part_name}" must be greater than 0`);
        return;
      }
    }

    setLoading(true);
    const toastId = toast.loading('Creating order...');

    try {
      let clientId = selectedClient;

      if (showNewClientForm && !recognizedClient) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            full_name: newClientName.trim(),
            phone: newClientPhone.trim(),
            email: newClientEmail.trim() || null,
            traffic_source: newClientSource,
            location_id: currentLocation?.id
          })
          .select()
          .single();

        if (clientError) {
          handleSupabaseError(clientError, 'Create client');
          return;
        }
        clientId = newClient.id;
      }

      if (!stages || stages.length === 0) {
        toast.error('No order stages found. Contact administrator.');
        return;
      }

      const firstStage = stages[0];
      const finalEstimatedCost = estimatedCost > 0 ? estimatedCost : calculateTotal();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: clientId,
          assigned_to: profile?.id,
          stage_id: firstStage?.id,
          device_type: deviceBrand,
          device_model: deviceModel,
          device_color: deviceColor,
          imei: deviceIMEI || null,
          serial_number: deviceSerialNumber || null,
          issue_description: issueDescription.trim(),
          priority: priority,
          estimated_cost: finalEstimatedCost,
          due_date: dueDate || null,
          location_id: currentLocation?.id,
          prepayment: prepayment || 0,
          waiting_for_parts: waitingForParts
        })
        .select()
        .single();

      if (orderError) {
        handleSupabaseError(orderError, 'Create order');
        return;
      }

      const orderItems = [];

      if (selectedServices.length > 0) {
        selectedServices.forEach(service => {
          orderItems.push({
            order_id: order.id,
            item_type: 'service',
            name: service.name,
            quantity: service.quantity,
            unit_price: service.price,
            unit_cost: service.cost,
            total_price: service.price * service.quantity,
            warranty_months: service.warranty_months
          });
        });
      }

      if (selectedParts.length > 0) {
        selectedParts.forEach(part => {
          orderItems.push({
            order_id: order.id,
            item_type: 'part',
            inventory_id: part.id,
            name: part.part_name,
            quantity: part.quantity,
            unit_price: part.selling_price,
            unit_cost: part.unit_cost || 0,
            total_price: part.selling_price * part.quantity,
            warranty_months: 0
          });
        });
      }

      if (orderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          handleSupabaseError(itemsError, 'Add order items');
          return;
        }
      }

      toast.dismiss(toastId);
      toast.success('Order created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.dismiss(toastId);
      handleSupabaseError(err, 'Create order');
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">Новый заказ</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Klients / Tālrunis
            </label>
            {!showNewClientForm ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    ref={firstInputRef as React.RefObject<HTMLSelectElement>}
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!showNewClientForm && !recognizedClient}
                  >
                    <option value="">Izvēlēties klientu</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.full_name} ({client.phone})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewClientForm(true);
                      setRecognizedClient(null);
                    }}
                    className="px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Jauns
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">Jauns klients</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewClientForm(false);
                      setNewClientPhone('');
                      setNewClientName('');
                      setNewClientEmail('');
                      setRecognizedClient(null);
                    }}
                    className="text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    Atcelt
                  </button>
                </div>

                <div>
                  <input
                    ref={firstInputRef as React.RefObject<HTMLInputElement>}
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="Tālrunis *"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={showNewClientForm}
                  />
                </div>

                <CustomerRecognition
                  phoneNumber={newClientPhone}
                  onClientSelect={handleClientSelect}
                  onNewClient={handleNewClient}
                  disabled={loading}
                />

                {!recognizedClient && (
                  <>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Vārds, Uzvārds *"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={showNewClientForm && !recognizedClient}
                    />
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="E-pasts (neobligāts)"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={newClientSource}
                      onChange={(e) => setNewClientSource(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="direct">Tieša vēršanās</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Google">Google</option>
                      <option value="Yandex">Yandex</option>
                      <option value="Facebook">Facebook</option>
                      <option value="referral">Ieteikums</option>
                    </select>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200 -mx-6 px-6 py-5 bg-neutral-50">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Ierīces informācija</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  IMEI
                </label>
                <SmartDeviceInput
                  type="imei"
                  value={deviceIMEI}
                  onChange={setDeviceIMEI}
                  onDeviceDetected={handleDeviceDetected}
                  placeholder="Ievadiet IMEI (15 cipari)"
                  locationId={currentLocation?.id}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Sērijas numurs
                </label>
                <SmartDeviceInput
                  type="serial"
                  value={deviceSerialNumber}
                  onChange={setDeviceSerialNumber}
                  placeholder="Ievadiet sērijas numuru"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Ražotājs (Brand) *
                </label>
                <input
                  type="text"
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  placeholder="Apple, Samsung, Xiaomi..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Modelis (Model) *
                </label>
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="iPhone 15 Pro, Galaxy S24..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <ColorPicker
                label="Krāsa (Color) *"
                value={deviceColor}
                onChange={setDeviceColor}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Problem Description *
              </label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the problem in detail..."
                rows={3}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Orientējošā cena
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimatedCost || ''}
                onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 pr-12 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-medium">
                EUR
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Если оставить пустым, будет рассчитана автоматически на основе услуг и запчастей
            </p>
          </div>

          <ServiceSearch onServiceSelect={handleServiceSelect} />

          <InventorySearch onItemSelect={handleInventorySelect} onRequestPart={handleRequestPart} />

          {(selectedServices.length > 0 || selectedParts.length > 0) && (
            <div className="border border-neutral-200 rounded-lg p-4 space-y-3 bg-neutral-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-neutral-900">Добавленные услуги и запчасти</h3>
                <div className="space-y-1 text-right">
                  <div className="text-sm text-neutral-600">
                    Сумма: <span className="font-semibold">€{calculateTotal().toFixed(2)}</span>
                  </div>
                  {prepayment > 0 && (
                    <>
                      <div className="text-sm text-green-600">
                        Депозит: <span className="font-semibold">-€{prepayment.toFixed(2)}</span>
                      </div>
                      <div className="text-sm text-neutral-900 font-semibold border-t border-neutral-300 pt-1">
                        К оплате: €{(calculateTotal() - prepayment).toFixed(2)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedServices.map((service) => (
                <div key={service.id} className="bg-white border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">{service.name}</div>
                      <div className="text-sm text-neutral-500">
                        €{service.price.toFixed(2)} × {service.quantity} = €{(service.price * service.quantity).toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeService(service.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Цена (€)
                      </label>
                      <input
                        ref={(el) => {
                          servicePriceRefs.current[service.id] = el;
                        }}
                        type="number"
                        step="0.01"
                        min="0"
                        value={service.price}
                        onChange={(e) => updateServicePrice(service.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <InputNumber
                      label="Количество"
                      value={service.quantity}
                      onChange={(value) => updateServiceQuantity(service.id, value)}
                      min={1}
                      max={99}
                    />
                    <InputNumber
                      label="Гарантия"
                      value={service.warranty_months}
                      onChange={(value) => updateServiceWarranty(service.id, value)}
                      min={0}
                      max={36}
                      suffix="мес"
                    />
                  </div>
                </div>
              ))}

              {selectedParts.map((part) => (
                <div key={part.id} className="bg-white border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">{part.part_name}</div>
                      <div className="text-sm text-neutral-500">
                        €{part.selling_price} × {part.quantity} = €{part.selling_price * part.quantity}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        ✓ Запчасть со склада (осталось: {part.quantity - part.quantity})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePart(part.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InputNumber
                      label="Количество"
                      value={part.quantity}
                      onChange={(value) => updatePartQuantity(part.id, Math.min(value, part.quantity))}
                      min={1}
                      max={part.quantity}
                    />
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Цена продажи
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={part.selling_price}
                        onChange={(e) => updatePartPrice(part.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="text-sm text-neutral-600 pt-2 border-t border-neutral-200">
                Примерное время выполнения: <span className="font-medium">{calculateEstimatedDuration()} мин</span>
              </div>
            </div>
          )}


          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Приоритет
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="urgent">Срочно</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Срок выполнения
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {calculateTotal() > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Депозит / Предоплата (необязательно)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={calculateTotal()}
                    value={prepayment || ''}
                    onChange={(e) => setPrepayment(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="text-sm text-blue-700">
                  {prepayment > 0 ? (
                    <span className="font-medium">
                      Остаток к оплате: €{(calculateTotal() - prepayment).toFixed(2)}
                    </span>
                  ) : (
                    <span>Введите сумму депозита</span>
                  )}
                </div>
              </div>
              {waitingForParts && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                  ⚠️ Заказ будет помечен как "Ожидает деталь"
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать заказ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
