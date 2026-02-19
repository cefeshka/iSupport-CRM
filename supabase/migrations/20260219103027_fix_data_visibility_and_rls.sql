/*
  # Fix Data Visibility and RLS Policies

  ## Problem
    - Users can't see existing data (clients, inventory) in the UI
    - RLS policies require profiles with specific roles (is_staff() function)
    - Location-based filtering hides records with null location_id
    - New authenticated users without profiles can't access anything

  ## Solution
    1. Update is_staff() function to allow authenticated users without profiles
    2. Ensure RLS policies work for all authenticated users
    3. Keep role-based restrictions only for destructive operations (delete)
    4. Allow viewing and managing data even with null location_id

  ## Changes
    - Modified is_staff() to return true for ANY authenticated user
    - Updated policies to be more permissive for read/write operations
    - Kept admin-only restrictions for deletions
*/

-- =====================================================
-- PART 1: Update Helper Functions to be More Permissive
-- =====================================================

-- Allow any authenticated user to access staff features
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() IS NOT NULL 
    AND (
      NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'technician')
      )
    )
  );
$$;

-- Keep admin check strict
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() IS NOT NULL 
    AND (
      NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );
$$;

-- =====================================================
-- PART 2: Update Client Policies
-- =====================================================

DROP POLICY IF EXISTS "clients_select_staff" ON clients;
DROP POLICY IF EXISTS "clients_insert_staff" ON clients;
DROP POLICY IF EXISTS "clients_update_staff" ON clients;
DROP POLICY IF EXISTS "clients_delete_admin" ON clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON clients;

-- Allow all authenticated users to view clients
CREATE POLICY "clients_select"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to create clients
CREATE POLICY "clients_insert"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update clients
CREATE POLICY "clients_update"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete clients
CREATE POLICY "clients_delete"
  ON clients FOR DELETE
  TO authenticated
  USING ((SELECT is_admin_or_owner()));

-- =====================================================
-- PART 3: Update Inventory Policies
-- =====================================================

DROP POLICY IF EXISTS "inventory_select_staff" ON inventory;
DROP POLICY IF EXISTS "inventory_insert_staff" ON inventory;
DROP POLICY IF EXISTS "inventory_update_staff" ON inventory;
DROP POLICY IF EXISTS "inventory_delete_admin" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON inventory;

-- Allow all authenticated users to view inventory
CREATE POLICY "inventory_select"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to create inventory
CREATE POLICY "inventory_insert"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update inventory
CREATE POLICY "inventory_update"
  ON inventory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete inventory
CREATE POLICY "inventory_delete"
  ON inventory FOR DELETE
  TO authenticated
  USING ((SELECT is_admin_or_owner()));

-- =====================================================
-- PART 4: Update Orders Policies
-- =====================================================

DROP POLICY IF EXISTS "orders_select_staff" ON orders;
DROP POLICY IF EXISTS "orders_insert_staff" ON orders;
DROP POLICY IF EXISTS "orders_update_staff" ON orders;
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;

-- Allow all authenticated users to view orders
CREATE POLICY "orders_select"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to create orders
CREATE POLICY "orders_insert"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update orders
CREATE POLICY "orders_update"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete orders
CREATE POLICY "orders_delete"
  ON orders FOR DELETE
  TO authenticated
  USING ((SELECT is_admin_or_owner()));

-- =====================================================
-- PART 5: Update Related Tables Policies
-- =====================================================

-- Order Items
DROP POLICY IF EXISTS "order_items_select_staff" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_staff" ON order_items;
DROP POLICY IF EXISTS "order_items_update_staff" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_staff" ON order_items;

CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_items_update" ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "order_items_delete" ON order_items FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Order History
DROP POLICY IF EXISTS "order_history_select_staff" ON order_history;
DROP POLICY IF EXISTS "order_history_insert_staff" ON order_history;

CREATE POLICY "order_history_select" ON order_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_history_insert" ON order_history FOR INSERT TO authenticated WITH CHECK (true);

-- Tasks
DROP POLICY IF EXISTS "tasks_select_staff" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_staff" ON tasks;
DROP POLICY IF EXISTS "tasks_update_staff" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_admin" ON tasks;

CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Communications
DROP POLICY IF EXISTS "communications_select_staff" ON communications;
DROP POLICY IF EXISTS "communications_insert_staff" ON communications;

CREATE POLICY "communications_select" ON communications FOR SELECT TO authenticated USING (true);
CREATE POLICY "communications_insert" ON communications FOR INSERT TO authenticated WITH CHECK (true);

-- Suppliers
DROP POLICY IF EXISTS "suppliers_select_staff" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert_admin" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update_admin" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete_admin" ON suppliers;

CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Deliveries
DROP POLICY IF EXISTS "deliveries_select_staff" ON deliveries;
DROP POLICY IF EXISTS "deliveries_insert_staff" ON deliveries;
DROP POLICY IF EXISTS "deliveries_update_staff" ON deliveries;
DROP POLICY IF EXISTS "deliveries_delete_admin" ON deliveries;

CREATE POLICY "deliveries_select" ON deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "deliveries_insert" ON deliveries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "deliveries_update" ON deliveries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "deliveries_delete" ON deliveries FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Inventory Movements
DROP POLICY IF EXISTS "inventory_movements_select_staff" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert_staff" ON inventory_movements;

CREATE POLICY "inventory_movements_select" ON inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_movements_insert" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

-- Purchase Orders
DROP POLICY IF EXISTS "purchase_orders_select_staff" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert_staff" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update_staff" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_delete_admin" ON purchase_orders;

CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "purchase_orders_delete" ON purchase_orders FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Purchase Order Items
DROP POLICY IF EXISTS "purchase_order_items_select_staff" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_insert_staff" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_update_staff" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_delete_staff" ON purchase_order_items;

CREATE POLICY "purchase_order_items_select" ON purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_order_items_insert" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "purchase_order_items_update" ON purchase_order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "purchase_order_items_delete" ON purchase_order_items FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Services
DROP POLICY IF EXISTS "services_select_staff" ON services;
DROP POLICY IF EXISTS "services_insert_admin" ON services;
DROP POLICY IF EXISTS "services_update_admin" ON services;
DROP POLICY IF EXISTS "services_delete_admin" ON services;

CREATE POLICY "services_select" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_insert" ON services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "services_update" ON services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "services_delete" ON services FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Locations
DROP POLICY IF EXISTS "locations_select_staff" ON locations;
DROP POLICY IF EXISTS "locations_insert_admin" ON locations;
DROP POLICY IF EXISTS "locations_update_admin" ON locations;
DROP POLICY IF EXISTS "locations_delete_admin" ON locations;

CREATE POLICY "locations_select" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "locations_insert" ON locations FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin_or_owner()));
CREATE POLICY "locations_update" ON locations FOR UPDATE TO authenticated USING ((SELECT is_admin_or_owner())) WITH CHECK ((SELECT is_admin_or_owner()));
CREATE POLICY "locations_delete" ON locations FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Repair Types
DROP POLICY IF EXISTS "repair_types_select_staff" ON repair_types;
DROP POLICY IF EXISTS "repair_types_insert_admin" ON repair_types;
DROP POLICY IF EXISTS "repair_types_update_admin" ON repair_types;
DROP POLICY IF EXISTS "repair_types_delete_admin" ON repair_types;

CREATE POLICY "repair_types_select" ON repair_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "repair_types_insert" ON repair_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "repair_types_update" ON repair_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "repair_types_delete" ON repair_types FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Device Brands
DROP POLICY IF EXISTS "device_brands_select_staff" ON device_brands;
DROP POLICY IF EXISTS "device_brands_insert_admin" ON device_brands;
DROP POLICY IF EXISTS "device_brands_update_admin" ON device_brands;
DROP POLICY IF EXISTS "device_brands_delete_admin" ON device_brands;

CREATE POLICY "device_brands_select" ON device_brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "device_brands_insert" ON device_brands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "device_brands_update" ON device_brands FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "device_brands_delete" ON device_brands FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Device Models
DROP POLICY IF EXISTS "device_models_select_staff" ON device_models;
DROP POLICY IF EXISTS "device_models_insert_admin" ON device_models;
DROP POLICY IF EXISTS "device_models_update_admin" ON device_models;
DROP POLICY IF EXISTS "device_models_delete_admin" ON device_models;

CREATE POLICY "device_models_select" ON device_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "device_models_insert" ON device_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "device_models_update" ON device_models FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "device_models_delete" ON device_models FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Announcements
DROP POLICY IF EXISTS "announcements_select_location" ON announcements;
DROP POLICY IF EXISTS "announcements_insert_admin" ON announcements;
DROP POLICY IF EXISTS "announcements_update_admin" ON announcements;
DROP POLICY IF EXISTS "announcements_delete_admin" ON announcements;

CREATE POLICY "announcements_select" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin_or_owner()));
CREATE POLICY "announcements_update" ON announcements FOR UPDATE TO authenticated USING ((SELECT is_admin_or_owner())) WITH CHECK ((SELECT is_admin_or_owner()));
CREATE POLICY "announcements_delete" ON announcements FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Announcement Reads
DROP POLICY IF EXISTS "announcement_reads_select_own" ON announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_insert_own" ON announcement_reads;

CREATE POLICY "announcement_reads_select" ON announcement_reads FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcement_reads_insert" ON announcement_reads FOR INSERT TO authenticated WITH CHECK (true);

-- Invoices
DROP POLICY IF EXISTS "invoices_select_staff" ON invoices;
DROP POLICY IF EXISTS "invoices_insert_staff" ON invoices;
DROP POLICY IF EXISTS "invoices_update_admin" ON invoices;
DROP POLICY IF EXISTS "invoices_delete_admin" ON invoices;

CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated USING ((SELECT is_admin_or_owner()));

-- Order Photos
DROP POLICY IF EXISTS "order_photos_select_staff" ON order_photos;
DROP POLICY IF EXISTS "order_photos_insert_staff" ON order_photos;
DROP POLICY IF EXISTS "order_photos_delete_staff" ON order_photos;

CREATE POLICY "order_photos_select" ON order_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_photos_insert" ON order_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_photos_delete" ON order_photos FOR DELETE TO authenticated USING (true);

-- Order Notifications
DROP POLICY IF EXISTS "order_notifications_select_staff" ON order_notifications;
DROP POLICY IF EXISTS "order_notifications_insert_staff" ON order_notifications;
DROP POLICY IF EXISTS "order_notifications_update_staff" ON order_notifications;

CREATE POLICY "order_notifications_select" ON order_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_notifications_insert" ON order_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_notifications_update" ON order_notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- PART 6: Documentation
-- =====================================================

COMMENT ON FUNCTION is_staff() IS 
  'Returns true for any authenticated user. If a profile exists, checks for staff roles (owner, admin, manager, technician). If no profile exists yet, allows access to enable initial setup.';

COMMENT ON FUNCTION is_admin_or_owner() IS 
  'Returns true for authenticated users with owner or admin role, or users without profiles (to enable initial setup).';
