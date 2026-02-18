import { useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocationProvider, useLocation } from './contexts/LocationContext';
import { AlertCircle } from 'lucide-react';
import AuthPage from './components/Auth/AuthPage';
import Sidebar from './components/Layout/Sidebar';
import MobileNav from './components/Layout/MobileNav';
import Dashboard from './components/Dashboard/Dashboard';
import OrdersView from './components/Orders/OrdersView';
import OrderDetail from './components/Orders/OrderDetail';
import NewOrderModal from './components/Orders/NewOrderModal';
import ClientsList from './components/Clients/ClientsList';
import ClientDetail from './components/Clients/ClientDetail';
import InventoryList from './components/Inventory/InventoryList';
import InventoryAudit from './components/Inventory/InventoryAudit';
import PurchasesList from './components/Purchases/PurchasesList';
import Analytics from './components/Analytics/Analytics';
import SalesList from './components/Sales/SalesList';
import Settings from './components/Settings/Settings';
import { BonusControlPanel } from './components/Payroll/BonusControlPanel';
import type { Database } from './lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type OrderStage = Database['public']['Tables']['order_stages']['Row'];

interface OrderWithDetails extends Order {
  client?: Client;
  stage?: OrderStage;
}

function AppContent() {
  console.log('AppContent rendering');
  const { user, loading } = useAuth();
  console.log('Auth state:', { user: !!user, loading });
  const { currentLocation, loading: locationLoading } = useLocation();
  console.log('Location state:', { currentLocation: !!currentLocation, locationLoading });
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading || locationLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-500">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!currentLocation) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border-2 border-amber-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">No Location Available</h2>
              <p className="text-sm text-neutral-500">Contact your administrator</p>
            </div>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            Your account is not assigned to any location. Please contact your system administrator to assign you to a branch location before you can access the system.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  function handleRefresh() {
    setRefreshKey(prev => prev + 1);
  }

  function renderView() {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard key={refreshKey} />;
      case 'orders':
        return <OrdersView key={refreshKey} onOrderClick={setSelectedOrder} />;
      case 'clients':
        return <ClientsList key={refreshKey} onClientClick={setSelectedClient} />;
      case 'inventory':
        return <InventoryList key={refreshKey} />;
      case 'inventory-audit':
        return <InventoryAudit key={refreshKey} />;
      case 'purchases':
        return <PurchasesList key={refreshKey} />;
      case 'sales':
        return <SalesList key={refreshKey} />;
      case 'analytics':
        return <Analytics key={refreshKey} />;
      case 'payroll':
        return <BonusControlPanel key={refreshKey} />;
      case 'settings':
        return <Settings key={refreshKey} />;
      default:
        return <Dashboard key={refreshKey} />;
    }
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          onQuickAction={() => setShowNewOrderModal(true)}
        />
      </div>

      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        {renderView()}
      </main>

      <div className="lg:hidden">
        <MobileNav
          activeView={activeView}
          onViewChange={setActiveView}
          onQuickAction={() => setShowNewOrderModal(true)}
        />
      </div>

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={handleRefresh}
        />
      )}

      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {showNewOrderModal && (
        <NewOrderModal
          onClose={() => setShowNewOrderModal(false)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Toaster position="top-right" expand={false} richColors closeButton />
        <AppContent />
      </LocationProvider>
    </AuthProvider>
  );
}
