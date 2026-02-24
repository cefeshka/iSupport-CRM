import { LayoutDashboard, FolderKanban, Users, Package, BarChart3, Plus, ShoppingCart, Settings, MapPin, X, Wallet } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-24 right-6 z-50 lg:hidden"
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onQuickAction}
            className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl shadow-large shadow-primary-500/40 flex items-center justify-center hover:from-primary-600 hover:to-primary-700 transition-all"
          >
            <Plus className="w-7 h-7" />
          </motion.button>
        </motion.div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 lg:hidden z-40 shadow-large">
        <div className="flex items-center justify-around px-2 py-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
              </motion.button>
            );
          })}
          {canSwitchLocation && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowLocationModal(true)}
              className="flex items-center justify-center w-12 h-12 rounded-xl transition-all text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <MapPin className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden flex items-end"
            onClick={() => setShowLocationModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl w-full rounded-t-3xl p-6 shadow-large"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Выберите филиал</h3>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => {
                      setCurrentLocation(location);
                      setShowLocationModal(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      currentLocation?.id === location.id
                        ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-soft'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <MapPin className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{location.name}</div>
                      {location.address && (
                        <div className="text-sm text-slate-500">{location.address}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
