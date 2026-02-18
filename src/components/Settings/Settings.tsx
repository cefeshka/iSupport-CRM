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
  ChevronRight
} from 'lucide-react';
import CompanyProfile from './CompanyProfile';
import ServiceCatalogManager from './ServiceCatalogManager';
import UsersManagement from './UsersManagement';
import LeadSourcesManager from './LeadSourcesManager';
import DocumentTemplates from './DocumentTemplates';
import DataExport from './DataExport';
import RolesPermissions from './RolesPermissions';
import SystemLogs from './SystemLogs';

type SettingsTab = 'company' | 'services' | 'team' | 'permissions' | 'sources' | 'templates' | 'logs' | 'export';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  const tabs = [
    { id: 'company' as SettingsTab, label: 'Профиль компании', icon: Building2, description: 'Реквизиты, брендинг, валюта' },
    { id: 'services' as SettingsTab, label: 'Каталог услуг', icon: Wrench, description: 'Услуги и ремонты' },
    { id: 'team' as SettingsTab, label: 'Команда', icon: Users, description: 'Сотрудники и роли' },
    { id: 'permissions' as SettingsTab, label: 'Права доступа', icon: Shield, description: 'Управление правами (RBAC)' },
    { id: 'sources' as SettingsTab, label: 'Источники лидов', icon: Target, description: 'Маркетинговые каналы' },
    { id: 'templates' as SettingsTab, label: 'Шаблоны документов', icon: FileText, description: 'Квитанции и договоры' },
    { id: 'logs' as SettingsTab, label: 'Журнал активности', icon: Activity, description: 'История действий персонала' },
    { id: 'export' as SettingsTab, label: 'Экспорт данных', icon: Download, description: 'Резервное копирование' },
  ];

  return (
    <div className="h-full overflow-auto bg-neutral-50">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7" />
            Настройки системы
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Полный контроль над конфигурацией CRM
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden sticky top-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-neutral-200 transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-neutral-500'}`} />
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${isActive ? 'text-blue-900' : 'text-neutral-700'}`}>
                        {tab.label}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {tab.description}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-neutral-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              {activeTab === 'company' && <CompanyProfile />}
              {activeTab === 'services' && <ServiceCatalogManager />}
              {activeTab === 'team' && <UsersManagement />}
              {activeTab === 'permissions' && <RolesPermissions />}
              {activeTab === 'sources' && <LeadSourcesManager />}
              {activeTab === 'templates' && <DocumentTemplates />}
              {activeTab === 'logs' && <SystemLogs />}
              {activeTab === 'export' && <DataExport />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
