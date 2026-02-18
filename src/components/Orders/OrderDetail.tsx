import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Clock, User, Phone, Mail, Plus, Search, FileText, TrendingUp, DollarSign, ChevronDown, Printer, Package, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import OrderItemEditPanel from './OrderItemEditPanel';
import OrderReceipt from './OrderReceipt';
import DefektacijasAkts from './DefektacijasAkts';
import InvoiceModal from './InvoiceModal';

type Order = Database['public']['Tables']['orders']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type OrderStage = Database['public']['Tables']['order_stages']['Row'];
type OrderHistory = Database['public']['Tables']['order_history']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type InventoryItem = Database['public']['Tables']['inventory']['Row'];

interface OrderWithDetails extends Order {
  client?: Client;
  stage?: OrderStage;
}

interface OrderDetailProps {
  order: OrderWithDetails;
  onClose: () => void;
  onUpdate: () => void;
}

type TabType = 'general' | 'services' | 'invoices' | 'files';

export default function OrderDetail({ order, onClose, onUpdate }: OrderDetailProps) {
  const { profile, isAdmin } = useAuth();
  const canDelete = isAdmin() || profile?.role === 'owner' || profile?.role === 'manager';
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stages, setStages] = useState<OrderStage[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentOrder, setCurrentOrder] = useState<OrderWithDetails>(order);

  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);

  const [technicianNotes, setTechnicianNotes] = useState(order.technician_notes || '');
  const [clientRecommendations, setClientRecommendations] = useState(order.client_recommendations || '');

  const [searchTerm, setSearchTerm] = useState('');
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDefektacijasAkts, setShowDefektacijasAkts] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'bank' | 'cash' | 'bs_cash'>('cash');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [inventorySearchResults, setInventorySearchResults] = useState<InventoryItem[]>([]);
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadOrderDetails();
  }, [order.id]);

  useEffect(() => {
    setTechnicianNotes(currentOrder.technician_notes || '');
    setClientRecommendations(currentOrder.client_recommendations || '');
  }, [currentOrder]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStageDropdown(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setShowInventoryDropdown(false);
      }
    }

    if (showStageDropdown || showInventoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStageDropdown, showInventoryDropdown]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchInventory(searchTerm.trim());
      }, 300);
    } else {
      setInventorySearchResults([]);
      setShowInventoryDropdown(false);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  async function loadOrderDetails() {
    const [historyRes, itemsRes, profilesRes, stagesRes, orderRes] = await Promise.all([
      supabase
        .from('order_history')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id),
      supabase
        .from('profiles')
        .select('*'),
      supabase
        .from('order_stages')
        .select('*')
        .order('position'),
      supabase
        .from('orders')
        .select('*, client:clients(*), stage:order_stages(*)')
        .eq('id', order.id)
        .single()
    ]);

    if (historyRes.data) setHistory(historyRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (stagesRes.data) setStages(stagesRes.data);
    if (orderRes.data) setCurrentOrder(orderRes.data);
  }

  async function searchInventory(query: string) {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .or(`part_name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
        .gt('quantity', 0)
        .order('part_name')
        .limit(10);

      if (error) throw error;

      setInventorySearchResults(data || []);
      setShowInventoryDropdown((data || []).length > 0);
    } catch (error) {
      console.error('Error searching inventory:', error);
      setInventorySearchResults([]);
      setShowInventoryDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }

  async function addInventoryItemToOrder(inventoryItem: InventoryItem) {
    if (!profile) return;

    try {
      const unitPrice = inventoryItem.unit_cost * 1.5;
      const quantity = 1;

      const { error } = await supabase.from('order_items').insert({
        order_id: currentOrder.id,
        item_type: 'part',
        name: inventoryItem.part_name,
        unit_cost: inventoryItem.unit_cost,
        unit_price: unitPrice,
        quantity: quantity,
        total_cost: inventoryItem.unit_cost * quantity,
        total_price: unitPrice * quantity,
        profit: (unitPrice - inventoryItem.unit_cost) * quantity,
        technician_id: profile.id,
        inventory_id: inventoryItem.id
      });

      if (error) throw error;

      await loadOrderDetails();
      setSearchTerm('');
      setShowInventoryDropdown(false);
      setInventorySearchResults([]);
      onUpdate();
    } catch (error) {
      console.error('Error adding inventory item to order:', error);
      alert('Ошибка при добавлении товара в заказ');
    }
  }

  async function addComment() {
    if (!newComment.trim() || !profile) return;

    await supabase.from('order_history').insert({
      order_id: currentOrder.id,
      user_id: profile.id,
      event_type: 'comment',
      description: newComment
    });

    setNewComment('');
    await loadOrderDetails();
  }

  async function saveNotes() {
    await supabase.from('orders').update({
      technician_notes: technicianNotes,
      client_recommendations: clientRecommendations
    }).eq('id', currentOrder.id);

    await loadOrderDetails();
    onUpdate();
  }

  async function handleSaveAndClose() {
    await saveNotes();
    onClose();
  }

  async function handleStageClick(stageId: string) {
    const stage = stages.find(s => s.id === stageId);
    if (stage?.name === 'Закрыт') {
      setShowPaymentModal(true);
      setShowStageDropdown(false);
    } else {
      await changeStage(stageId);
    }
  }

  async function confirmCloseOrder() {
    const closedStage = stages.find(s => s.name === 'Закрыт');
    if (closedStage) {
      await changeStage(closedStage.id, selectedPaymentMethod);
    }
    setShowPaymentModal(false);
  }

  async function changeStage(newStageId: string, paymentMethod?: 'bank' | 'cash' | 'bs_cash') {
    const newStage = stages.find(s => s.id === newStageId);
    if (!newStage) return;

    const isClosed = newStage.name === 'Закрыт';

    const updateData: any = {
      stage_id: newStageId,
    };

    if (isClosed && !currentOrder.completed_at) {
      const finalAmount = (currentOrder.subtotal || 0) - (currentOrder.total_discount || 0);
      updateData.completed_at = new Date().toISOString();
      updateData.final_cost = finalAmount || currentOrder.estimated_cost;
      updateData.total_profit = currentOrder.estimated_profit || 0;
      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }
    }

    await supabase.from('orders').update(updateData).eq('id', currentOrder.id);

    if (profile) {
      await supabase.from('order_history').insert({
        order_id: currentOrder.id,
        user_id: profile.id,
        event_type: 'status_change',
        description: `Статус изменен на "${newStage.name}"`
      });
    }

    setShowStageDropdown(false);
    await loadOrderDetails();
    onUpdate();
  }

  async function handleDeleteItem(itemId: string, event: React.MouseEvent) {
    event.stopPropagation();

    if (!confirm('Удалить эту позицию из заказа?')) return;

    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      alert('Ошибка при удалении позиции: ' + error.message);
      return;
    }

    if (profile) {
      await supabase.from('order_history').insert({
        order_id: currentOrder.id,
        user_id: profile.id,
        event_type: 'item_deleted',
        description: 'Позиция удалена из заказа'
      });
    }

    await loadOrderDetails();
    onUpdate();
  }

  const getTechnicianName = (technicianId: string | null) => {
    if (!technicianId) return 'Не назначен';
    const tech = profiles.find(p => p.id === technicianId);
    return tech?.full_name || 'Неизвестен';
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'part': return 'Деталь';
      case 'service': return 'Работа';
      case 'accessory': return 'Аксессуар';
      default: return type;
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'part': return 'bg-blue-100 text-blue-700';
      case 'service': return 'bg-green-100 text-green-700';
      case 'accessory': return 'bg-orange-100 text-orange-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };


  const calculatePartsTotal = () => {
    return items
      .filter(item => item.item_type === 'part')
      .reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const calculateServicesTotal = () => {
    return items
      .filter(item => item.item_type === 'service')
      .reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
        onClick={handleOverlayClick}
      >
        <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Ticket {currentOrder.order_number}
                </h2>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowStageDropdown(!showStageDropdown)}
                    className={`px-2.5 py-1 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all hover:shadow-md ${
                      currentOrder.stage?.name === 'Закрыт' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                      currentOrder.stage?.name === 'В работе' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                      'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {currentOrder.stage?.name}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {showStageDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 py-1">
                      {stages.map((stage) => (
                        <button
                          key={stage.id}
                          onClick={() => handleStageClick(stage.id)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 transition-colors ${
                            stage.id === currentOrder.stage_id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-neutral-700'
                          }`}
                        >
                          {stage.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-neutral-500">
                {currentOrder.device_type} {currentOrder.device_model}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Sagatavot rēķinu
              </button>
              <button
                onClick={() => setShowDefektacijasAkts(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Izveidot Defektācijas aktu
              </button>
              <button
                onClick={() => setShowReceipt(true)}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Drukāt kvīti
              </button>
              <button
                onClick={saveNotes}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Сохранить
              </button>
              <button
                onClick={handleSaveAndClose}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                Сохранить и закрыть
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
          </div>

          <div className="border-b border-neutral-200">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                General info
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'services'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Services and products
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'invoices'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Invoices and payments
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'files'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Files
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">Client Information</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Name</span>
                          <span className="text-sm font-medium text-blue-900">{currentOrder.client?.full_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Phone</span>
                          <span className="text-sm font-medium text-blue-900">{currentOrder.client?.phone}</span>
                        </div>
                        {currentOrder.client?.email && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700">Email</span>
                            <span className="text-sm font-medium text-blue-900">{currentOrder.client.email}</span>
                          </div>
                        )}
                        {(currentOrder as any).lead_source && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700">Lead Source</span>
                            <span className="text-sm font-medium text-blue-900">{(currentOrder as any).lead_source}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-900">Device Information</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700">Type</span>
                          <span className="text-sm font-medium text-green-900">{currentOrder.device_type}</span>
                        </div>
                        {currentOrder.device_model && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700">Model</span>
                            <span className="text-sm font-medium text-green-900">{currentOrder.device_model}</span>
                          </div>
                        )}
                        {(currentOrder as any).imei_serial && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700">IMEI/S/N</span>
                            <span className="text-sm font-medium text-green-900">{(currentOrder as any).imei_serial}</span>
                          </div>
                        )}
                        {(currentOrder as any).device_condition && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700">Condition</span>
                            <span className="text-sm font-medium text-green-900">{(currentOrder as any).device_condition}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700">Priority</span>
                          <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                            currentOrder.priority === 'urgent' ? 'bg-red-500 text-white' :
                            currentOrder.priority === 'high' ? 'bg-orange-500 text-white' :
                            currentOrder.priority === 'medium' ? 'bg-yellow-500 text-white' :
                            'bg-neutral-500 text-white'
                          }`}>{currentOrder.priority}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                      <h3 className="font-semibold text-neutral-900 mb-3">Issue Description</h3>
                      <p className="text-neutral-700 text-sm leading-relaxed">{currentOrder.issue_description}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-purple-900">Order Details</h3>
                      </div>
                      <div className="space-y-3">
                        {currentOrder.assigned_to && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-purple-700">Assigned To</span>
                            <span className="text-sm font-medium text-purple-900">{getTechnicianName(currentOrder.assigned_to)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Accepted At</span>
                          <span className="text-sm font-medium text-purple-900">
                            {new Date(currentOrder.accepted_at || currentOrder.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        {currentOrder.due_date && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-purple-700">Expected Date</span>
                            <span className="text-sm font-medium text-purple-900">
                              {new Date(currentOrder.due_date).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        )}
                        {currentOrder.completed_at && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-purple-700">Completed At</span>
                            <span className="text-sm font-medium text-purple-900">
                              {new Date(currentOrder.completed_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Order Number</span>
                          <span className="text-sm font-bold text-purple-900">#{(currentOrder as any).order_number || currentOrder.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-neutral-200 p-5">
                      <h3 className="font-semibold text-neutral-900 mb-4">Event History</h3>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {history.length === 0 ? (
                          <p className="text-sm text-neutral-500 text-center py-4">No events yet</p>
                        ) : (
                          history.map((event) => (
                            <div key={event.id} className="flex gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-neutral-900">{event.description}</p>
                                <p className="text-xs text-neutral-500 mt-1">
                                  {new Date(event.created_at).toLocaleString('ru-RU')}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-neutral-200">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addComment()}
                            placeholder="Add comment..."
                            className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <button
                            onClick={addComment}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 relative" ref={searchDropdownRef}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Название, штрихкод, артикул или SKU товара..."
                        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {showInventoryDropdown && inventorySearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                          <div className="p-2">
                            <div className="text-xs font-medium text-neutral-500 px-3 py-2">
                              Найдено товаров: {inventorySearchResults.length}
                            </div>
                            {inventorySearchResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => addInventoryItemToOrder(item)}
                                className="w-full text-left px-3 py-3 hover:bg-blue-50 rounded-lg transition-colors border-b border-neutral-100 last:border-0"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-neutral-900">{item.part_name}</div>
                                    <div className="flex items-center gap-3 mt-1">
                                      {item.sku && (
                                        <span className="text-xs text-neutral-500">
                                          SKU: {item.sku}
                                        </span>
                                      )}
                                      {item.barcode && (
                                        <span className="text-xs text-neutral-500">
                                          Barcode: {item.barcode}
                                        </span>
                                      )}
                                      <span className="text-xs text-neutral-500">
                                        Себестоимость: €{item.unit_cost.toFixed(2)}
                                      </span>
                                      <span className="text-xs text-blue-600 font-medium">
                                        Цена продажи: €{(item.unit_cost * 1.5).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                                      item.quantity <= item.min_quantity
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {item.quantity} шт на складе
                                    </div>
                                    <div className="text-xs text-neutral-500 mt-1">
                                      {item.location}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isSearching && searchTerm.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 p-4">
                          <div className="text-center text-sm text-neutral-500">
                            Поиск товаров...
                          </div>
                        </div>
                      )}

                      {!isSearching && searchTerm.length >= 2 && inventorySearchResults.length === 0 && !showInventoryDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 p-4">
                          <div className="text-center text-sm text-neutral-500">
                            Товары не найдены
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">Name</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">Price, €</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-neutral-600">Qty</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">Technician</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-neutral-600 w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-neutral-200 last:border-0 hover:bg-neutral-50 transition-colors"
                        >
                          <td className="px-4 py-3 cursor-pointer" onClick={() => setEditingItem(item)}>
                            <div className="flex items-center gap-2">
                              {item.inventory_id && (
                                <Package className="w-3.5 h-3.5 text-green-600" title="From inventory" />
                              )}
                              <span className="text-sm text-neutral-900">{item.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs ${getItemTypeColor(item.item_type)}`}>
                                {getItemTypeLabel(item.item_type)}
                              </span>
                            </div>
                            {item.item_comment && (
                              <p className="text-xs text-neutral-500 mt-1">{item.item_comment}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right cursor-pointer" onClick={() => setEditingItem(item)}>
                            <span className="text-sm font-medium text-neutral-900">
                              {item.total_price.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center cursor-pointer" onClick={() => setEditingItem(item)}>
                            <span className="text-sm text-neutral-600">{item.quantity} pcs</span>
                          </td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => setEditingItem(item)}>
                            <span className="text-sm text-neutral-600">
                              {getTechnicianName(item.assigned_technician_id)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {canDelete && (
                              <button
                                onClick={(e) => handleDeleteItem(item.id, e)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                                title="Удалить позицию"
                              >
                                <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => setIsAddingNewItem(true)}
                  className="mb-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add item
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="bg-neutral-50 rounded-xl p-4 space-y-2 mb-4">
                      <h3 className="font-medium text-neutral-900 mb-3">Costs & Work Summary</h3>

                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Parts Total</span>
                        <span className="font-medium text-neutral-900">{calculatePartsTotal().toFixed(2)} EUR</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Services Total</span>
                        <span className="font-medium text-neutral-900">{calculateServicesTotal().toFixed(2)} EUR</span>
                      </div>

                      <div className="flex justify-between text-sm border-t pt-2 mt-2">
                        <span className="text-neutral-600">Subtotal</span>
                        <span className="font-medium text-neutral-900">{currentOrder.subtotal?.toFixed(2) || '0.00'} EUR</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Discount</span>
                        <span className="font-medium text-red-600">-{currentOrder.total_discount?.toFixed(2) || '0.00'} EUR</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2 bg-white -mx-4 px-4 py-2 rounded">
                        <span>Total Sum</span>
                        <span>{currentOrder.total_cost?.toFixed(2) || '0.00'} EUR</span>
                      </div>

                      {currentOrder.prepayment && currentOrder.prepayment > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">Depozīts / Priekšapmaksa</span>
                            <span className="font-medium text-green-600">-{currentOrder.prepayment.toFixed(2)} EUR</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold bg-blue-50 -mx-4 px-4 py-2 rounded">
                            <span>Balance Due</span>
                            <span className="text-blue-600">{currentOrder.balance_due?.toFixed(2) || '0.00'} EUR</span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t mt-2">
                        <div className="flex flex-col">
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            Net Profit
                          </span>
                          <span className="text-xs text-neutral-500">Services + Markup on parts</span>
                        </div>
                        <span className="text-xl font-bold text-green-600">{currentOrder.estimated_profit?.toFixed(2) || '0.00'} EUR</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Technician notes</label>
                      <textarea
                        value={technicianNotes}
                        onChange={(e) => setTechnicianNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Internal notes for technicians..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Conclusion / client recommendations</label>
                      <textarea
                        value={clientRecommendations}
                        onChange={(e) => setClientRecommendations(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Recommendations for the client..."
                      />
                    </div>

                    <button
                      onClick={saveNotes}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Save notes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">Invoices and payments section</p>
                  <p className="text-sm text-neutral-400 mt-1">Payment tracking coming soon</p>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">Files section</p>
                  <p className="text-sm text-neutral-400 mt-1">File management coming soon</p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>

      {(editingItem || isAddingNewItem) && (
        <OrderItemEditPanel
          orderId={currentOrder.id}
          item={editingItem}
          onClose={() => {
            setEditingItem(null);
            setIsAddingNewItem(false);
          }}
          onSave={async () => {
            await loadOrderDetails();
            onUpdate();
          }}
        />
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Выберите способ оплаты</h3>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={selectedPaymentMethod === 'cash'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as 'cash')}
                  className="w-4 h-4"
                />
                <span className="font-medium text-neutral-900">Касса</span>
              </label>

              <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="bank"
                  checked={selectedPaymentMethod === 'bank'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as 'bank')}
                  className="w-4 h-4"
                />
                <span className="font-medium text-neutral-900">Банк/терминал</span>
              </label>

              <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="bs_cash"
                  checked={selectedPaymentMethod === 'bs_cash'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as 'bs_cash')}
                  className="w-4 h-4"
                />
                <span className="font-medium text-neutral-900">БС Касса</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={confirmCloseOrder}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Закрыть заказ
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && (
        <OrderReceipt
          order={{
            order_number: currentOrder.order_number || '',
            client_name: currentOrder.client?.full_name || '',
            client_phone: currentOrder.client?.phone || '',
            device_type: currentOrder.device_type || '',
            device_model: currentOrder.device_model || '',
            issue_description: currentOrder.issue_description || '',
            estimated_cost: currentOrder.estimated_cost || 0,
            due_date: currentOrder.due_date || '',
            imei: currentOrder.imei,
            appearance: currentOrder.appearance,
            prepayment: currentOrder.prepayment || 0,
            created_at: currentOrder.created_at || ''
          }}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {showDefektacijasAkts && (
        <DefektacijasAkts
          order={{
            order_number: currentOrder.order_number || 'N/A',
            device_name: currentOrder.device_name || 'Nav norādīts',
            imei_serial: currentOrder.imei || 'Nav norādīts',
            problem_description: currentOrder.problem_description || 'Nav norādīts',
            final_cost: currentOrder.final_cost || 0
          }}
          masterName={profile?.full_name || 'Nav norādīts'}
          onClose={() => setShowDefektacijasAkts(false)}
        />
      )}

      {showInvoiceModal && (
        <InvoiceModal
          order={currentOrder}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </>
  );
}
