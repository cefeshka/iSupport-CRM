/*
  # Fix RLS Performance and Security Issues

  1. RLS Performance Optimization
    - Fix `announcement_reads` policies to use `(select auth.uid())`
    - Fix `role_permissions` policies to use `(select auth.uid())`
    - Fix `order_history` policies to use `(select auth.uid())`
    - Fix `order_photos` policies to use `(select auth.uid())`
  
  2. Multiple Permissive Policies Fix
    - Consolidate `role_permissions` SELECT policies into single policy
  
  3. Function Security
    - Fix `can_access_location` function search_path to be immutable
  
  4. Index Optimization
    - Remove unused indexes that are not being utilized
*/

-- ============================================================================
-- 1. Fix RLS Policies for Performance
-- ============================================================================

-- Fix announcement_reads policies
DROP POLICY IF EXISTS "announcement_reads_insert" ON public.announcement_reads;
CREATE POLICY "announcement_reads_insert"
  ON public.announcement_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Fix role_permissions policies - Drop old permissive policies first
DROP POLICY IF EXISTS "Admin and managers can view all permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Technicians can view own role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admin can delete permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admin can insert permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admin can update permissions" ON public.role_permissions;

-- Create consolidated SELECT policy for role_permissions
CREATE POLICY "Users can view relevant permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND (
        profiles.role = 'Admin'
        OR profiles.role = 'Manager'
        OR profiles.role = role_permissions.role
      )
    )
  );

-- Create admin-only policies for role_permissions modifications
CREATE POLICY "Only admin can insert permissions"
  ON public.role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Only admin can update permissions"
  ON public.role_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Only admin can delete permissions"
  ON public.role_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'Admin'
    )
  );

-- Fix order_history policies
DROP POLICY IF EXISTS "order_history_insert" ON public.order_history;
CREATE POLICY "order_history_insert"
  ON public.order_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
    )
  );

-- Fix order_photos policies
DROP POLICY IF EXISTS "order_photos_delete_own" ON public.order_photos;
CREATE POLICY "order_photos_delete_own"
  ON public.order_photos
  FOR DELETE
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "order_photos_insert_staff" ON public.order_photos;
CREATE POLICY "order_photos_insert_staff"
  ON public.order_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
    )
  );

-- ============================================================================
-- 2. Fix Function Search Path
-- ============================================================================

-- Recreate can_access_location function with stable search_path
CREATE OR REPLACE FUNCTION public.can_access_location(p_location_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.location_id = p_location_id
      OR profiles.role IN ('Admin', 'Manager')
    )
  );
END;
$$;

-- ============================================================================
-- 3. Remove Unused Indexes (Critical Performance Improvement)
-- ============================================================================

-- Drop unused indexes on activity_logs
DROP INDEX IF EXISTS public.idx_activity_logs_user_id;

-- Drop unused indexes on announcement_reads
DROP INDEX IF EXISTS public.idx_announcement_reads_user_id;

-- Drop unused indexes on announcements
DROP INDEX IF EXISTS public.idx_announcements_created_by;
DROP INDEX IF EXISTS public.idx_announcements_location_id;

-- Drop unused indexes on api_keys
DROP INDEX IF EXISTS public.idx_api_keys_created_by;

-- Drop unused indexes on audit_log
DROP INDEX IF EXISTS public.idx_audit_log_location_id;
DROP INDEX IF EXISTS public.idx_audit_log_user_id;

-- Drop unused indexes on audit_logs
DROP INDEX IF EXISTS public.idx_audit_logs_location_id;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;

-- Drop unused indexes on clients
DROP INDEX IF EXISTS public.idx_clients_location_id;

-- Drop unused indexes on communications
DROP INDEX IF EXISTS public.idx_communications_order_id;

-- Drop unused indexes on document_templates
DROP INDEX IF EXISTS public.idx_document_templates_created_by;

-- Drop unused indexes on inventory
DROP INDEX IF EXISTS public.idx_inventory_location_id;
DROP INDEX IF EXISTS public.idx_inventory_supplier_id;

-- Drop unused indexes on inventory_categories
DROP INDEX IF EXISTS public.idx_inventory_categories_location_id;

-- Drop unused indexes on inventory_movements
DROP INDEX IF EXISTS public.idx_inventory_movements_destination_location_id;
DROP INDEX IF EXISTS public.idx_inventory_movements_inventory_id;
DROP INDEX IF EXISTS public.idx_inventory_movements_location_id;
DROP INDEX IF EXISTS public.idx_inventory_movements_order_id;
DROP INDEX IF EXISTS public.idx_inventory_movements_supplier_id;
DROP INDEX IF EXISTS public.idx_inventory_movements_user_id;

-- Drop unused indexes on invoices
DROP INDEX IF EXISTS public.idx_invoices_created_by;
DROP INDEX IF EXISTS public.idx_invoices_location_id;
DROP INDEX IF EXISTS public.idx_invoices_order_id;

-- Drop unused indexes on order_history
DROP INDEX IF EXISTS public.idx_order_history_user_id;

-- Drop unused indexes on order_items
DROP INDEX IF EXISTS public.idx_order_items_assigned_technician_id;
DROP INDEX IF EXISTS public.idx_order_items_inventory_id;
DROP INDEX IF EXISTS public.idx_order_items_order_id;

-- Drop unused indexes on order_notifications
DROP INDEX IF EXISTS public.idx_order_notifications_client_id;
DROP INDEX IF EXISTS public.idx_order_notifications_order_id;

-- Drop unused indexes on order_photos
DROP INDEX IF EXISTS public.idx_order_photos_order_id;
DROP INDEX IF EXISTS public.idx_order_photos_uploaded_by;

-- Drop unused indexes on orders
DROP INDEX IF EXISTS public.idx_orders_assigned_to;
DROP INDEX IF EXISTS public.idx_orders_master_id;
DROP INDEX IF EXISTS public.idx_orders_repair_type_id;

-- Drop unused indexes on profiles
DROP INDEX IF EXISTS public.idx_profiles_location_id;

-- Drop unused indexes on purchase_order_items
DROP INDEX IF EXISTS public.idx_purchase_order_items_inventory_id;

-- Drop unused indexes on purchase_orders
DROP INDEX IF EXISTS public.idx_purchase_orders_created_by;
DROP INDEX IF EXISTS public.idx_purchase_orders_location_id;
DROP INDEX IF EXISTS public.idx_purchase_orders_received_by;
DROP INDEX IF EXISTS public.idx_purchase_orders_supplier_id;

-- Drop unused indexes on stock_audit_items
DROP INDEX IF EXISTS public.idx_stock_audit_items_audit_id;
DROP INDEX IF EXISTS public.idx_stock_audit_items_inventory_id;

-- Drop unused indexes on stock_audits
DROP INDEX IF EXISTS public.idx_stock_audits_completed_by;
DROP INDEX IF EXISTS public.idx_stock_audits_location_id;
DROP INDEX IF EXISTS public.idx_stock_audits_started_by;

-- Drop unused indexes on tasks
DROP INDEX IF EXISTS public.idx_tasks_assigned_to;
DROP INDEX IF EXISTS public.idx_tasks_order_id;

-- ============================================================================
-- 4. Add Comments for Documentation
-- ============================================================================

COMMENT ON POLICY "Users can view relevant permissions" ON public.role_permissions IS 
  'Consolidated policy: Admins and Managers see all permissions, others see only their role permissions. Uses (select auth.uid()) for performance.';

COMMENT ON FUNCTION public.can_access_location(uuid) IS 
  'Check if current user can access a specific location. Now uses STABLE and fixed search_path for security.';
