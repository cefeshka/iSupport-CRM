import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Wrench,
  Users,
  Target,
  Package,
  FileText,
  Download,
  Shield,
  Activity,
  ChevronRight,
  Truck
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import CompanyProfile from './CompanyProfile';
import ServiceCatalogManager from './ServiceCatalogManager';
import UsersManagement from './UsersManagement';
import LeadSourcesManager from './LeadSourcesManager';
import DocumentTemplates from './DocumentTemplates';
import DataExport from './DataExport';
import RolesPermissions from './RolesPermissions';
import SystemLogs from './SystemLogs';
import SuppliersManager from './SuppliersManager';
import { motion } from 'framer-motion';

type SettingsTab = 'company' | 'services' | 'suppliers' | 'team' | 'permissions' | 'sources' | 'templates' | 'logs' | 'export';

export default function Settings() {
  const { canManageUsers, canEditTemplates, canManageLocations } = usePermissions();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  const allTabs = [
    { id: 'company' as SettingsTab, label: 'Профиль компании', icon: Building2, description: 'Реквизиты, брендинг, валюта', requiresPermission: false },
    { id: 'services' as SettingsTab, label: 'Каталог услуг', icon: Wrench, description: 'Услуги и ремонты', requiresPermission: false },
    { id: 'suppliers' as SettingsTab, label: 'Поставщики', icon: Truck, description: 'Управление поставщиками', requiresPermission: false },
    { id: 'team' as SettingsTab, label: 'Команда', icon: Users, description: 'Сотрудники и роли', requiresPermission: true, checkPermission: () => canManageUsers() },
    { id: 'permissions' as SettingsTab, label: 'Права доступа', icon: Shield, description: 'Управление правами (RBAC)', requiresPermission: true, checkPermission: () => canManageUsers() },
    { id: 'sources' as SettingsTab, label: 'Источники лидов', icon: Target, description: 'Маркетинговые каналы', requiresPermission: false },
    { id: 'templates' as SettingsTab, label: 'Шаблоны документов', icon: FileText, description: 'Квитанции и договоры', requiresPermission: true, checkPermission: () => canEditTemplates() },
    { id: 'logs' as SettingsTab, label: 'Журнал активности', icon: Activity, description: 'История действий персонала', requiresPermission: true, checkPermission: () => canManageUsers() },
    { id: 'export' as SettingsTab, label: 'Экспорт данных', icon: Download, description: 'Резервное копирование', requiresPermission: false },
  ];

  const tabs = allTabs.filter(tab => !tab.requiresPermission || (tab.checkPermission && tab.checkPermission()));

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary-600" />
            Настройки системы
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Полный контроль над конфигурацией CRM
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="glass-panel overflow-hidden sticky top-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 border-l-4 border-l-primary-500'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-semibold ${isActive ? 'text-primary-900' : 'text-slate-700'}`}>
                        {tab.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {tab.description}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-panel p-6"
            >
              {activeTab === 'company' && <CompanyProfile />}
              {activeTab === 'services' && <ServiceCatalogManager />}
              {activeTab === 'suppliers' && <SuppliersManager />}
              {activeTab === 'team' && <UsersManagement />}
              {activeTab === 'permissions' && <RolesPermissions />}
              {activeTab === 'sources' && <LeadSourcesManager />}
              {activeTab === 'templates' && <DocumentTemplates />}
              {activeTab === 'logs' && <SystemLogs />}
              {activeTab === 'export' && <DataExport />}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
