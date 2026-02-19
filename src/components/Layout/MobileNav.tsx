import { LayoutDashboard, FolderKanban, Users, Package, BarChart3, Plus, ShoppingCart, Settings, MapPin, X, Wallet } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useState } from 'react';

interface MobileNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onQuickAction: () => void;
}

export default function MobileNav({ activeView, onViewChange, onQuickAction }: MobileNavProps) {
  const { locations, currentLocation, setCurrentLocation, canSwitchLocation } = useLocation();
  const { canCreateOrder } = usePermissions();
  const [showLocationModal, setShowLocationModal] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'orders', icon: FolderKanban },
    { id: 'clients', icon: Users },
    { id: 'inventory', icon: Package },
    { id: 'sales', icon: ShoppingCart },
    { id: 'analytics', icon: BarChart3 },
    { id: 'payroll', icon: Wallet },
    { id: 'settings', icon: Settings },
  ];

  return (
    <>
      {canCreateOrder() && (
        <div className="fixed bottom-6 right-6 z-50 lg:hidden">
          <button
            onClick={onQuickAction}
            className="w-14 h-14 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-full shadow-lg shadow-fuchsia-500/30 flex items-center justify-center hover:from-fuchsia-600 hover:to-pink-600 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 lg:hidden z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center justify-center w-12 h-12 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-fuchsia-50 to-pink-50 text-fuchsia-600'
                    : 'text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
          {canSwitchLocation && (
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center justify-center w-12 h-12 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900"
            >
              <MapPin className="w-5 h-5" />
            </button>
          )}
        </div>
      </nav>

      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Выберите филиал</h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    setCurrentLocation(location);
                    setShowLocationModal(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    currentLocation?.id === location.id
                      ? 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{location.name}</div>
                    {location.address && (
                      <div className="text-sm text-neutral-500">{location.address}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
