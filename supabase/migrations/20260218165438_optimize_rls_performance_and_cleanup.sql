/*
  # Optimize RLS Performance and Clean Up Database

  ## 1. RLS Performance Optimization
    - Replace `auth.uid()` with `(SELECT auth.uid())` in all policies
    - This prevents re-evaluation for each row, improving query performance at scale

  ## 2. Remove Duplicate Policies
    - Drop old/conflicting policies that create multiple permissive policies
    - Keep only the optimized versions

  ## 3. Drop Unused Indexes
    - Remove indexes that haven't been used to improve write performance
    - Reduces database size and maintenance overhead

  ## 4. Documentation
    - Note: Auth DB Connection Strategy and Leaked Password Protection 
      must be configured in Supabase Dashboard under Authentication settings
*/

-- =====================================================
-- PART 1: Optimize RLS Policies - Replace auth.uid()
-- =====================================================

-- Drop all existing policies that will be recreated with optimization
DROP POLICY IF EXISTS "Admins can view api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can create api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can update api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete api keys" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_admin" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert_admin" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update_admin" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete_admin" ON api_keys;

DROP POLICY IF EXISTS "Staff can view delivery items" ON delivery_items;
DROP POLICY IF EXISTS "Admins can manage delivery items" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_select_staff" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_insert_staff" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_update_staff" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_delete_admin" ON delivery_items;

DROP POLICY IF EXISTS "Staff can view document templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can manage document templates" ON document_templates;
DROP POLICY IF EXISTS "document_templates_select_staff" ON document_templates;
DROP POLICY IF EXISTS "document_templates_insert_admin" ON document_templates;
DROP POLICY IF EXISTS "document_templates_update_admin" ON document_templates;
DROP POLICY IF EXISTS "document_templates_delete_admin" ON document_templates;

DROP POLICY IF EXISTS "Staff can view inventory categories" ON inventory_categories;
DROP POLICY IF EXISTS "Admins can manage inventory categories" ON inventory_categories;
DROP POLICY IF EXISTS "inventory_categories_select_all" ON inventory_categories;
DROP POLICY IF EXISTS "inventory_categories_insert_admin" ON inventory_categories;
DROP POLICY IF EXISTS "inventory_categories_update_admin" ON inventory_categories;
DROP POLICY IF EXISTS "inventory_categories_delete_admin" ON inventory_categories;

DROP POLICY IF EXISTS "Staff can view lead sources" ON lead_sources;
DROP POLICY IF EXISTS "Admins can manage lead sources" ON lead_sources;
DROP POLICY IF EXISTS "lead_sources_select_all" ON lead_sources;
DROP POLICY IF EXISTS "lead_sources_insert_admin" ON lead_sources;
DROP POLICY IF EXISTS "lead_sources_update_admin" ON lead_sources;
DROP POLICY IF EXISTS "lead_sources_delete_admin" ON lead_sources;

DROP POLICY IF EXISTS "Staff can view service catalog" ON service_catalog;
DROP POLICY IF EXISTS "Admins can manage service catalog" ON service_catalog;
DROP POLICY IF EXISTS "service_catalog_select_all" ON service_catalog;
DROP POLICY IF EXISTS "service_catalog_insert_admin" ON service_catalog;
DROP POLICY IF EXISTS "service_catalog_update_admin" ON service_catalog;
DROP POLICY IF EXISTS "service_catalog_delete_admin" ON service_catalog;

DROP POLICY IF EXISTS "Staff can view stock audit items" ON stock_audit_items;
DROP POLICY IF EXISTS "Staff can manage stock audit items" ON stock_audit_items;
DROP POLICY IF EXISTS "stock_audit_items_select_staff" ON stock_audit_items;
DROP POLICY IF EXISTS "stock_audit_items_insert_staff" ON stock_audit_items;
DROP POLICY IF EXISTS "stock_audit_items_update_staff" ON stock_audit_items;
DROP POLICY IF EXISTS "stock_audit_items_delete_manager" ON stock_audit_items;

DROP POLICY IF EXISTS "Staff can view stock audits" ON stock_audits;
DROP POLICY IF EXISTS "Staff can manage stock audits" ON stock_audits;
DROP POLICY IF EXISTS "stock_audits_select_location" ON stock_audits;
DROP POLICY IF EXISTS "stock_audits_insert_manager" ON stock_audits;
DROP POLICY IF EXISTS "stock_audits_update_manager" ON stock_audits;
DROP POLICY IF EXISTS "stock_audits_delete_admin" ON stock_audits;

DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
DROP POLICY IF EXISTS "system_settings_select_all" ON system_settings;
DROP POLICY IF EXISTS "system_settings_update_admin" ON system_settings;

DROP POLICY IF EXISTS "Staff can view traffic sources" ON traffic_sources;
DROP POLICY IF EXISTS "Admins can manage traffic sources" ON traffic_sources;
DROP POLICY IF EXISTS "traffic_sources_select_all" ON traffic_sources;
DROP POLICY IF EXISTS "traffic_sources_insert_admin" ON traffic_sources;
DROP POLICY IF EXISTS "traffic_sources_update_admin" ON traffic_sources;
DROP POLICY IF EXISTS "traffic_sources_delete_admin" ON traffic_sources;

DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_staff" ON activity_logs;

DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON audit_logs;

-- Create optimized policies with (SELECT auth.uid())

-- api_keys policies
CREATE POLICY "api_keys_select"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "api_keys_insert"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "api_keys_update"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "api_keys_delete"
  ON api_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- delivery_items policies
CREATE POLICY "delivery_items_select"
  ON delivery_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "delivery_items_insert"
  ON delivery_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "delivery_items_update"
  ON delivery_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "delivery_items_delete"
  ON delivery_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- document_templates policies
CREATE POLICY "document_templates_select"
  ON document_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "document_templates_insert"
  ON document_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "document_templates_update"
  ON document_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "document_templates_delete"
  ON document_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- inventory_categories policies
CREATE POLICY "inventory_categories_select"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "inventory_categories_insert"
  ON inventory_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "inventory_categories_update"
  ON inventory_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "inventory_categories_delete"
  ON inventory_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- lead_sources policies
CREATE POLICY "lead_sources_select"
  ON lead_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "lead_sources_insert"
  ON lead_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "lead_sources_update"
  ON lead_sources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "lead_sources_delete"
  ON lead_sources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- service_catalog policies
CREATE POLICY "service_catalog_select"
  ON service_catalog FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "service_catalog_insert"
  ON service_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "service_catalog_update"
  ON service_catalog FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "service_catalog_delete"
  ON service_catalog FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- stock_audit_items policies
CREATE POLICY "stock_audit_items_select"
  ON stock_audit_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "stock_audit_items_insert"
  ON stock_audit_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "stock_audit_items_update"
  ON stock_audit_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "stock_audit_items_delete"
  ON stock_audit_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- stock_audits policies
CREATE POLICY "stock_audits_select"
  ON stock_audits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "stock_audits_insert"
  ON stock_audits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "stock_audits_update"
  ON stock_audits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "stock_audits_delete"
  ON stock_audits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- system_settings policies
CREATE POLICY "system_settings_select"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "system_settings_insert"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "system_settings_update"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "system_settings_delete"
  ON system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- traffic_sources policies
CREATE POLICY "traffic_sources_select"
  ON traffic_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "traffic_sources_insert"
  ON traffic_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "traffic_sources_update"
  ON traffic_sources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "traffic_sources_delete"
  ON traffic_sources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- activity_logs policy
CREATE POLICY "activity_logs_insert"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- audit_logs policy
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- PART 2: Drop Unused Indexes
-- =====================================================

-- Drop unused indexes to improve write performance and reduce database size
DROP INDEX IF EXISTS idx_audit_log_location_id;
DROP INDEX IF EXISTS idx_audit_log_user_id;
DROP INDEX IF EXISTS idx_stock_audit_items_audit_id;
DROP INDEX IF EXISTS idx_stock_audit_items_inventory_id;
DROP INDEX IF EXISTS idx_announcements_created_by;
DROP INDEX IF EXISTS idx_announcements_expires_at;
DROP INDEX IF EXISTS idx_announcements_priority;
DROP INDEX IF EXISTS idx_announcements_location;
DROP INDEX IF EXISTS idx_announcements_active;
DROP INDEX IF EXISTS idx_announcement_reads_announcement;
DROP INDEX IF EXISTS idx_announcement_reads_user;
DROP INDEX IF EXISTS idx_profiles_location_id;
DROP INDEX IF EXISTS idx_order_history_user_id;
DROP INDEX IF EXISTS idx_inventory_supplier_id;
DROP INDEX IF EXISTS idx_inventory_location_id;
DROP INDEX IF EXISTS idx_orders_assigned_to;
DROP INDEX IF EXISTS idx_orders_lead_source;
DROP INDEX IF EXISTS idx_orders_master_id;
DROP INDEX IF EXISTS idx_orders_repair_type_id;
DROP INDEX IF EXISTS idx_orders_waiting_for_parts;
DROP INDEX IF EXISTS idx_orders_imei;
DROP INDEX IF EXISTS idx_orders_serial_number;
DROP INDEX IF EXISTS idx_inventory_movements_destination_location_id;
DROP INDEX IF EXISTS idx_inventory_movements_order_id;
DROP INDEX IF EXISTS idx_inventory_movements_supplier_id;
DROP INDEX IF EXISTS idx_inventory_movements_user_id;
DROP INDEX IF EXISTS idx_inventory_movements_inventory_id;
DROP INDEX IF EXISTS idx_inventory_movements_location_id;
DROP INDEX IF EXISTS idx_communications_order_id;
DROP INDEX IF EXISTS idx_tasks_assigned_to;
DROP INDEX IF EXISTS idx_tasks_order_id;
DROP INDEX IF EXISTS idx_deliveries_expected_date;
DROP INDEX IF EXISTS idx_deliveries_status;
DROP INDEX IF EXISTS idx_order_photos_order_id;
DROP INDEX IF EXISTS idx_order_photos_uploaded_by;
DROP INDEX IF EXISTS idx_order_items_assigned_technician_id;
DROP INDEX IF EXISTS idx_order_items_inventory_id;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_order_notifications_order_id;
DROP INDEX IF EXISTS idx_order_notifications_status;
DROP INDEX IF EXISTS idx_order_notifications_client_id;
DROP INDEX IF EXISTS idx_services_category;
DROP INDEX IF EXISTS idx_services_is_active;
DROP INDEX IF EXISTS idx_invoices_order;
DROP INDEX IF EXISTS idx_invoices_number;
DROP INDEX IF EXISTS idx_invoices_location;
DROP INDEX IF EXISTS idx_invoices_issued_date;
DROP INDEX IF EXISTS idx_invoices_created_at;
DROP INDEX IF EXISTS idx_invoices_created_by;
DROP INDEX IF EXISTS idx_document_templates_created_by;
DROP INDEX IF EXISTS idx_api_keys_created_by;
DROP INDEX IF EXISTS idx_clients_location_id;
DROP INDEX IF EXISTS idx_purchase_order_items_inventory_id;
DROP INDEX IF EXISTS idx_purchase_orders_supplier;
DROP INDEX IF EXISTS idx_purchase_orders_expected_date;
DROP INDEX IF EXISTS idx_purchase_orders_location_id;
DROP INDEX IF EXISTS idx_purchase_orders_created_by;
DROP INDEX IF EXISTS idx_purchase_orders_received_by;
DROP INDEX IF EXISTS idx_audit_logs_location_id;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_inventory_categories_location_id;
DROP INDEX IF EXISTS idx_role_permissions_permission_id;
DROP INDEX IF EXISTS idx_activity_logs_user_id;
DROP INDEX IF EXISTS idx_stock_audits_location;
DROP INDEX IF EXISTS idx_stock_audits_status;
DROP INDEX IF EXISTS idx_stock_audits_completed_by;
DROP INDEX IF EXISTS idx_stock_audits_started_by;

-- =====================================================
-- PART 3: Documentation and Manual Configuration Notes
-- =====================================================

COMMENT ON DATABASE postgres IS 
  'Manual Configuration Required in Supabase Dashboard:
  
  1. Auth DB Connection Strategy:
     - Navigate to: Authentication > Configuration > Database
     - Change connection pool strategy from fixed number to percentage-based
     - This allows better scaling with instance size changes
  
  2. Leaked Password Protection:
     - Navigate to: Authentication > Providers > Email
     - Enable "Leaked Password Protection"
     - This checks passwords against HaveIBeenPwned.org database
  
  These settings cannot be configured via SQL migrations and must be set in the dashboard.';
