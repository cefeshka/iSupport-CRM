import { LayoutDashboard, FolderKanban, Users, Package, BarChart3, LogOut, Plus, ShoppingCart, Settings, Truck, MapPin, ChevronDown, Wallet, ClipboardCheck, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useState } from 'react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onQuickAction: () => void;
}

export default function Sidebar({ activeView, onViewChange, onQuickAction }: SidebarProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const { locations, currentLocation, setCurrentLocation, canSwitchLocation } = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { canCreateOrder, canManageUsers } = usePermissions();
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const isTechnician = profile?.role === 'technician';
  const canViewSettings = canManageUsers();

  const allMenuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'orders', label: t('nav.orders'), icon: FolderKanban },
    { id: 'clients', label: t('nav.clients'), icon: Users },
    { id: 'inventory', label: t('nav.inventory'), icon: Package },
    { id: 'inventory-audit', label: t('inventory.audit'), icon: ClipboardCheck },
    { id: 'purchases', label: t('nav.purchases'), icon: Truck },
    { id: 'sales', label: t('nav.sales'), icon: ShoppingCart },
    { id: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
    { id: 'payroll', label: language === 'ru' ? 'Зарплата' : 'Alga', icon: Wallet, requiresAdmin: true },
    { id: 'settings', label: t('nav.settings'), icon: Settings, requiresAdmin: true },
  ];

  const menuItems = allMenuItems.filter(item => !item.requiresAdmin || canViewSettings);

  return (
    <div className="w-64 bg-white border-r border-neutral-200 flex flex-col h-screen">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <img
            src="/isupport_png.png"
            alt="iSupport"
            className="h-10 w-auto object-contain"
          />
          <div>
            <h1 className="font-semibold text-neutral-900">iSupport CRM</h1>
            <p className="text-xs text-neutral-500">{profile?.full_name}</p>
          </div>
        </div>
      </div>

      {canCreateOrder() && (
        <button
          onClick={onQuickAction}
          className="m-4 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white px-4 py-2.5 rounded-lg font-medium hover:from-fuchsia-600 hover:to-pink-600 transition-all shadow-md shadow-fuchsia-500/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('orders.new')}
        </button>
      )}

      <div className="mx-4 mb-4">
        <div className="relative">
          {canSwitchLocation ? (
            <>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-neutral-900 truncate">
                    {currentLocation?.name || 'Выберите филиал'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-600 transition-transform flex-shrink-0 ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showLocationDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowLocationDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    {locations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => {
                          setCurrentLocation(location);
                          setShowLocationDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                          currentLocation?.id === location.id
                            ? 'bg-fuchsia-50 text-fuchsia-600'
                            : 'hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{location.name}</div>
                          {location.address && (
                            <div className="text-xs text-neutral-500 truncate">{location.address}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full flex items-center gap-2 px-3 py-2.5 bg-neutral-100 border border-neutral-200 rounded-lg cursor-not-allowed opacity-75">
              <MapPin className="w-4 h-4 text-neutral-600 flex-shrink-0" />
              <span className="text-sm font-medium text-neutral-900 truncate">
                {currentLocation?.name || 'Филиал'}
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-fuchsia-50 to-pink-50 text-fuchsia-600 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-200 space-y-2">
        <div className="relative">
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm flex-1 text-left">{language === 'ru' ? 'Русский' : 'Latviešu'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showLanguageDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowLanguageDropdown(false)}
              />
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => {
                    setLanguage('ru');
                    setShowLanguageDropdown(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    language === 'ru'
                      ? 'bg-fuchsia-50 text-fuchsia-600 font-medium'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  Русский (RU)
                </button>
                <button
                  onClick={() => {
                    setLanguage('lv');
                    setShowLanguageDropdown(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    language === 'lv'
                      ? 'bg-fuchsia-50 text-fuchsia-600 font-medium'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  Latviešu (LV)
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );
}
