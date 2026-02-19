import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Permission {
  role: string;
  module: string;
  action: string;
  allowed: boolean;
}

interface PermissionsCache {
  [key: string]: boolean;
}

export function usePermissions() {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsCache, setPermissionsCache] = useState<PermissionsCache>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role) {
      loadPermissions();
    }
  }, [profile?.role]);

  const loadPermissions = async () => {
    if (!profile?.role) return;

    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', profile.role);

    if (error) {
      console.error('Error loading permissions:', error);
      setLoading(false);
      return;
    }

    setPermissions(data || []);

    const cache: PermissionsCache = {};
    (data || []).forEach((perm: Permission) => {
      const key = `${perm.module}.${perm.action}`;
      cache[key] = perm.allowed;
    });
    setPermissionsCache(cache);
    setLoading(false);
  };

  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (profile?.role === 'admin') {
      return true;
    }

    const key = `${module}.${action}`;
    return permissionsCache[key] || false;
  }, [profile?.role, permissionsCache]);

  const canCreateOrder = useCallback(() => hasPermission('orders', 'create'), [hasPermission]);
  const canEditOrder = useCallback(() => hasPermission('orders', 'edit'), [hasPermission]);
  const canDeleteOrder = useCallback(() => hasPermission('orders', 'delete'), [hasPermission]);
  const canChangeOrderStatus = useCallback(() => hasPermission('orders', 'change_status'), [hasPermission]);
  const canViewOrder = useCallback(() => hasPermission('orders', 'view'), [hasPermission]);

  const canViewInventory = useCallback(() => hasPermission('inventory', 'view'), [hasPermission]);
  const canAddInventory = useCallback(() => hasPermission('inventory', 'add'), [hasPermission]);
  const canEditInventory = useCallback(() => hasPermission('inventory', 'edit'), [hasPermission]);
  const canDeleteInventory = useCallback(() => hasPermission('inventory', 'delete'), [hasPermission]);
  const canManageSuppliers = useCallback(() => hasPermission('inventory', 'manage_suppliers'), [hasPermission]);

  const canViewFinancialReports = useCallback(() => hasPermission('finances', 'view_reports'), [hasPermission]);
  const canAddExpenses = useCallback(() => hasPermission('finances', 'add_expenses'), [hasPermission]);
  const canDeleteTransactions = useCallback(() => hasPermission('finances', 'delete_transactions'), [hasPermission]);

  const canManageUsers = useCallback(() => hasPermission('settings', 'manage_users'), [hasPermission]);
  const canEditTemplates = useCallback(() => hasPermission('settings', 'edit_templates'), [hasPermission]);
  const canManageLocations = useCallback(() => hasPermission('settings', 'manage_locations'), [hasPermission]);

  return {
    permissions,
    loading,
    hasPermission,
    canCreateOrder,
    canEditOrder,
    canDeleteOrder,
    canChangeOrderStatus,
    canViewOrder,
    canViewInventory,
    canAddInventory,
    canEditInventory,
    canDeleteInventory,
    canManageSuppliers,
    canViewFinancialReports,
    canAddExpenses,
    canDeleteTransactions,
    canManageUsers,
    canEditTemplates,
    canManageLocations,
  };
}
