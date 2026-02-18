import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Edit, Plus, Check } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  name: string;
  description: string | null;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
  granted: boolean;
}

export default function RolesPermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
      supabase.from('roles').select('*').order('name'),
      supabase.from('permissions').select('*').order('module, action'),
      supabase.from('role_permissions').select('role_id, permission_id, granted')
    ]);

    if (rolesRes.data) setRoles(rolesRes.data);
    if (permsRes.data) setPermissions(permsRes.data);
    if (rolePermsRes.data) setRolePermissions(rolePermsRes.data);
    setLoading(false);
  }

  function hasPermission(roleId: string, permissionId: string) {
    const rp = rolePermissions.find(rp => rp.role_id === roleId && rp.permission_id === permissionId);
    return rp?.granted || false;
  }

  async function togglePermission(roleId: string, permissionId: string) {
    const exists = rolePermissions.find(rp => rp.role_id === roleId && rp.permission_id === permissionId);
    const newValue = !hasPermission(roleId, permissionId);

    if (exists) {
      const { error } = await supabase
        .from('role_permissions')
        .update({ granted: newValue })
        .eq('role_id', roleId)
        .eq('permission_id', permissionId);

      if (!error) {
        setRolePermissions(prev =>
          prev.map(rp =>
            rp.role_id === roleId && rp.permission_id === permissionId
              ? { ...rp, granted: newValue }
              : rp
          )
        );
      }
    } else {
      const { error } = await supabase
        .from('role_permissions')
        .insert({ role_id: roleId, permission_id: permissionId, granted: newValue });

      if (!error) {
        setRolePermissions(prev => [...prev, { role_id: roleId, permission_id: permissionId, granted: newValue }]);
      }
    }
  }

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categoryNames: Record<string, string> = {
    orders: 'Заказы',
    clients: 'Клиенты',
    inventory: 'Склад',
    finance: 'Финансы',
    analytics: 'Аналитика',
    settings: 'Настройки',
    locations: 'Филиалы',
    users: 'Сотрудники'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Права доступа</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Настройте уровни доступа для разных ролей
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Загрузка...</div>
      ) : (
        <div className="space-y-6">
          {roles.map((role) => (
            <div key={role.id} className="border border-neutral-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors"
                onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">{role.name}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    {rolePermissions.filter(rp => rp.role_id === role.id && rp.granted).length} полномочий
                  </span>
                  <button className="p-1.5 hover:bg-neutral-200 rounded transition-colors">
                    <Edit className="w-4 h-4 text-neutral-600" />
                  </button>
                </div>
              </div>

              {selectedRole === role.id && (
                <div className="p-4 border-t border-neutral-200 bg-white">
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module}>
                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {categoryNames[module] || module}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {perms.map((perm) => {
                            const checked = hasPermission(role.id, perm.id);
                            return (
                              <label
                                key={perm.id}
                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer border border-neutral-200"
                              >
                                <div className="flex items-center h-5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(role.id, perm.id)}
                                    disabled={role.is_system && role.name === 'Админ'}
                                    className="w-4 h-4 text-blue-600 border-neutral-300 rounded focus:ring-blue-500"
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-neutral-900">
                                    {perm.name}
                                  </div>
                                  {perm.description && (
                                    <div className="text-xs text-neutral-500 mt-0.5">
                                      {perm.description}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Admin Override</h4>
            <p className="text-xs text-blue-700">
              Роль "Админ" имеет <strong>безусловный доступ ко всем функциям системы</strong>, независимо от отметок в чекбоксах.
              Это означает, что администраторы могут просматривать и переключать филиалы, управлять сотрудниками, изменять настройки
              и иметь полный доступ к данным без ограничений.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
