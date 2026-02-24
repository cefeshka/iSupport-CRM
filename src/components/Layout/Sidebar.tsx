import { LayoutDashboard, FolderKanban, Users, Package, BarChart3, LogOut, Plus, ShoppingCart, Settings, Truck, MapPin, ChevronDown, Wallet, ClipboardCheck, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="w-64 h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900 to-slate-950" />
      <div className="absolute inset-0 backdrop-blur-3xl bg-slate-900/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col h-full border-r border-white/10">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src="/isupport_png.png"
              alt="iSupport"
              className="h-10 w-auto object-contain drop-shadow-lg"
            />
            <div>
              <h1 className="font-semibold text-white">iSupport CRM</h1>
              <p className="text-xs text-slate-400">{profile?.full_name}</p>
            </div>
          </div>
        </div>

        {canCreateOrder() && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onQuickAction}
            className="m-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-3 rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-large shadow-primary-500/30 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('orders.new')}
          </motion.button>
        )}

        <div className="mx-4 mb-4">
          <div className="relative">
            {canSwitchLocation ? (
              <>
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-white truncate">
                      {currentLocation?.name || 'Выберите филиал'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showLocationDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowLocationDropdown(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-large z-20 overflow-hidden"
                      >
                        {locations.map((location) => (
                          <button
                            key={location.id}
                            onClick={() => {
                              setCurrentLocation(location);
                              setShowLocationDropdown(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                              currentLocation?.id === location.id
                                ? 'bg-primary-500/20 text-primary-300 border-l-2 border-primary-400'
                                : 'hover:bg-white/5 text-slate-300'
                            }`}
                          >
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{location.name}</div>
                              {location.address && (
                                <div className="text-xs text-slate-500 truncate">{location.address}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl cursor-not-allowed opacity-50">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm font-medium text-white truncate">
                  {currentLocation?.name || 'Филиал'}
                </span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500/20 to-primary-600/20 text-white font-medium shadow-glow border border-primary-400/30'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all"
            >
              <Globe className="w-5 h-5" />
              <span className="text-sm flex-1 text-left">{language === 'ru' ? 'Русский' : 'Latviešu'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showLanguageDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowLanguageDropdown(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-large z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setLanguage('ru');
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        language === 'ru'
                          ? 'bg-primary-500/20 text-primary-300 font-medium border-l-2 border-primary-400'
                          : 'hover:bg-white/5 text-slate-300'
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
                          ? 'bg-primary-500/20 text-primary-300 font-medium border-l-2 border-primary-400'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      Latviešu (LV)
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">{t('nav.logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
