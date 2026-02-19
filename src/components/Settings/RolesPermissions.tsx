import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Save, AlertCircle } from 'lucide-react';
import { toast } from '../../lib/toast';

interface Permission {
  id: string;
  role: string;
  module: string;
  action: string;
  allowed: boolean;
}

interface PermissionDefinition {
  module: string;
  moduleName: string;
  actions: {
    action: string;
    actionName: string;
    description: string;
  }[];
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    module: 'orders',
    moduleName: 'Orders',
    actions: [
      { action: 'view', actionName: 'View Orders', description: 'View all orders' },
      { action: 'create', actionName: 'Create Orders', description: 'Create new orders' },
      { action: 'edit', actionName: 'Edit Orders', description: 'Modify existing orders' },
      { action: 'delete', actionName: 'Delete Orders', description: 'Delete orders' },
      { action: 'change_status', actionName: 'Change Status', description: 'Update order status' },
    ],
  },
  {
    module: 'inventory',
    moduleName: 'Inventory/Parts',
    actions: [
      { action: 'view', actionName: 'View Inventory', description: 'View inventory items' },
      { action: 'add', actionName: 'Add Items', description: 'Add new inventory items' },
      { action: 'edit', actionName: 'Edit Items', description: 'Modify inventory items' },
      { action: 'delete', actionName: 'Delete Items', description: 'Delete inventory items' },
      { action: 'manage_suppliers', actionName: 'Manage Suppliers', description: 'Manage supplier relationships' },
    ],
  },
  {
    module: 'finances',
    moduleName: 'Finances',
    actions: [
      { action: 'view_reports', actionName: 'View Financial Reports', description: 'View financial analytics' },
      { action: 'add_expenses', actionName: 'Add Expenses', description: 'Add expense records' },
      { action: 'delete_transactions', actionName: 'Delete Transactions', description: 'Delete financial transactions' },
    ],
  },
  {
    module: 'settings',
    moduleName: 'Settings',
    actions: [
      { action: 'manage_users', actionName: 'Manage Users', description: 'Add, edit, or remove users' },
      { action: 'edit_templates', actionName: 'Edit Print Templates', description: 'Customize document templates' },
      { action: 'manage_locations', actionName: 'Manage Locations', description: 'Manage company locations' },
    ],
  },
];

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'technician', label: 'Technician', color: 'bg-green-100 text-green-800' },
];

export default function RolesPermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  async function loadPermissions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role')
      .order('module')
      .order('action');

    if (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    } else {
      setPermissions(data || []);
    }
    setLoading(false);
  }

  function hasPermission(role: string, module: string, action: string): boolean {
    const perm = permissions.find(
      (p) => p.role === role && p.module === module && p.action === action
    );
    return perm?.allowed || false;
  }

  async function togglePermission(role: string, module: string, action: string) {
    if (role === 'admin') {
      toast.error('Admin permissions cannot be modified');
      return;
    }

    const currentValue = hasPermission(role, module, action);
    const newValue = !currentValue;

    const { error } = await supabase
      .from('role_permissions')
      .update({ allowed: newValue })
      .eq('role', role)
      .eq('module', module)
      .eq('action', action);

    if (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
      return;
    }

    setPermissions((prev) =>
      prev.map((p) =>
        p.role === role && p.module === module && p.action === action
          ? { ...p, allowed: newValue }
          : p
      )
    );

    toast.success('Permission updated');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-500">Loading permissions...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Role Permissions</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Configure access levels for different roles
          </p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider w-80">
                  Permission
                </th>
                {ROLES.map((role) => (
                  <th
                    key={role.value}
                    className="px-6 py-4 text-center text-xs font-semibold text-neutral-700 uppercase tracking-wider"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${role.color}`}>
                        {role.label}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {PERMISSION_DEFINITIONS.map((moduleDef) => (
                <>
                  <tr key={`module-${moduleDef.module}`} className="bg-neutral-50">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-sm font-bold text-neutral-900 uppercase tracking-wide"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        {moduleDef.moduleName}
                      </div>
                    </td>
                  </tr>
                  {moduleDef.actions.map((actionDef) => (
                    <tr
                      key={`${moduleDef.module}-${actionDef.action}`}
                      className="hover:bg-neutral-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {actionDef.actionName}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {actionDef.description}
                          </div>
                        </div>
                      </td>
                      {ROLES.map((role) => {
                        const isChecked = hasPermission(
                          role.value,
                          moduleDef.module,
                          actionDef.action
                        );
                        const isAdmin = role.value === 'admin';

                        return (
                          <td key={role.value} className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAdmin}
                                onChange={() =>
                                  togglePermission(
                                    role.value,
                                    moduleDef.module,
                                    actionDef.action
                                  )
                                }
                                className={`w-5 h-5 rounded border-neutral-300 focus:ring-2 focus:ring-blue-500 ${
                                  isAdmin
                                    ? 'text-neutral-400 cursor-not-allowed'
                                    : 'text-blue-600 cursor-pointer'
                                }`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Admin Override</h4>
            <p className="text-xs text-blue-700">
              The <strong>Admin</strong> role has <strong>immutable full access</strong> to all
              system features. Admin permissions are always enabled and cannot be modified. This
              ensures that at least one role can always manage the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
