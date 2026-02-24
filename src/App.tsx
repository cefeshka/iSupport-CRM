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
  const { user, loading, profile, isAdmin } = useAuth();
  console.log('Auth state:', { user: !!user, loading, profile });
  const { currentLocation, locations, loading: locationLoading } = useLocation();
  console.log('Location state:', { currentLocation: !!currentLocation, locations: locations.length, locationLoading });
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading || locationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-950 flex items-center justify-center">
        <div className="text-slate-300">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const isDevelopment = import.meta.env.DEV;

  if (!currentLocation && locations.length === 0 && !isDevelopment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-large">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-400/30">
              <AlertCircle className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">No Location Found</h2>
              <p className="text-sm text-slate-400">Setup required</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-6">
            No locations have been created in the system yet. {isAdmin() ? 'Please create a location in Settings to continue.' : 'Please contact your administrator to set up locations.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all text-sm font-medium shadow-glow"
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
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 overflow-hidden">
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
