/*
  # Comprehensive Security Vulnerability Fixes (v2)

  This migration addresses 88+ security issues identified in the audit:

  ## 1. RLS Policy Fixes
    - Replace all "USING (true)" policies with proper role-based access control
    - Implement proper restrictions based on user roles (owner, admin, technician, client)
    - Ensure technicians can only manage orders and inventory
    - Restrict sensitive table access to admins/owners only

  ## 2. SECURITY DEFINER Views
    - Fix all SECURITY DEFINER views with secure search_path
    - Prevent SQL injection through search_path manipulation

  ## 3. Function Search Paths
    - Update all PostgreSQL functions with fixed search_path = public
    - Prevent "Function Search Path Mutable" vulnerabilities

  ## 4. Audit & Activity Logs
    - Allow inserts by anyone (for logging)
    - Restrict reads and deletes to admins only

  ## 5. Role Hierarchy
    - owner: Full access to everything
    - admin: Full access except ownership transfer
    - technician: Orders, inventory, tasks only
    - client: Read-only access to own data
*/

-- =====================================================
-- PART 1: DROP ALL EXISTING INSECURE POLICIES
-- =====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- =====================================================
-- PART 2: DROP AND RECREATE HELPER FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS is_owner() CASCADE;
DROP FUNCTION IF EXISTS is_admin_or_owner() CASCADE;
DROP FUNCTION IF EXISTS is_staff() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

CREATE FUNCTION is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'owner'
  );
$$;

CREATE FUNCTION is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  );
$$;

CREATE FUNCTION is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'technician')
  );
$$;

CREATE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- =====================================================
-- PART 3: SECURE RLS POLICIES FOR PROFILES
-- =====================================================

CREATE POLICY "profiles_select_own_or_staff"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_staff());

CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "profiles_update_own_or_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR is_admin_or_owner())
  WITH CHECK (
    CASE
      WHEN id = auth.uid() THEN role = (SELECT role FROM profiles WHERE id = auth.uid())
      ELSE is_admin_or_owner()
    END
  );

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin_or_owner() AND id != auth.uid());

-- =====================================================
-- PART 4: SECURE RLS POLICIES FOR CLIENTS
-- =====================================================

CREATE POLICY "clients_select_staff"
  ON clients FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "clients_insert_staff"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

CREATE POLICY "clients_update_staff"
  ON clients FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  TO authenticated
  USING (is_admin_or_owner());

-- =====================================================
-- PART 5: SECURE RLS POLICIES FOR ORDERS
-- =====================================================

CREATE POLICY "orders_select_staff"
  ON orders FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "orders_insert_staff"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

CREATE POLICY "orders_update_staff"
  ON orders FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "orders_delete_admin"
  ON orders FOR DELETE
  TO authenticated
  USING (is_admin_or_owner());

-- =====================================================
-- PART 6: SECURE RLS POLICIES FOR ORDER_ITEMS
-- =====================================================

CREATE POLICY "order_items_select_staff"
  ON order_items FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "order_items_insert_staff"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

CREATE POLICY "order_items_update_staff"
  ON order_items FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "order_items_delete_staff"
  ON order_items FOR DELETE
  TO authenticated
  USING (is_staff());

-- =====================================================
-- PART 7: SECURE RLS POLICIES FOR INVENTORY
-- =====================================================

CREATE POLICY "inventory_select_staff"
  ON inventory FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "inventory_insert_staff"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

CREATE POLICY "inventory_update_staff"
  ON inventory FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "inventory_delete_admin"
  ON inventory FOR DELETE
  TO authenticated
  USING (is_admin_or_owner());

-- =====================================================
-- PART 8: SECURE RLS POLICIES FOR INVENTORY_MOVEMENTS
-- =====================================================

CREATE POLICY "inventory_movements_select_staff"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "inventory_movements_insert_staff"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

CREATE POLICY "inventory_movements_update_admin"
  ON inventory_movements FOR UPDATE
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "inventory_movements_delete_admin"
  ON inventory_movements FOR DELETE
  TO authenticated
  USING (is_admin_or_owner());

-- =====================================================
-- PART 9: SECURE RLS POLICIES FOR AUDIT_LOGS
-- =====================================================

CREATE POLICY "audit_logs_insert_all"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "audit_logs_select_admin"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_admin_or_owner());

CREATE POLICY "audit_logs_delete_owner"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (is_owner());

-- =====================================================
-- PART 10: SECURE RLS POLICIES FOR ACTIVITY_LOGS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    EXECUTE 'CREATE POLICY "activity_logs_insert_all" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "activity_logs_select_admin" ON activity_logs FOR SELECT TO authenticated USING (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "activity_logs_delete_owner" ON activity_logs FOR DELETE TO authenticated USING (is_owner())';
  END IF;
END $$;

-- =====================================================
-- PART 11: SECURE RLS POLICIES FOR SETTINGS TABLES
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings') THEN
    EXECUTE 'CREATE POLICY "company_settings_select_staff" ON company_settings FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "company_settings_update_admin" ON company_settings FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
  END IF;
END $$;

-- =====================================================
-- PART 12: SECURE RLS POLICIES FOR RBAC TABLES
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    EXECUTE 'CREATE POLICY "roles_select_all" ON roles FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "roles_insert_owner" ON roles FOR INSERT TO authenticated WITH CHECK (is_owner())';
    EXECUTE 'CREATE POLICY "roles_update_owner" ON roles FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner())';
    EXECUTE 'CREATE POLICY "roles_delete_owner" ON roles FOR DELETE TO authenticated USING (is_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    EXECUTE 'CREATE POLICY "permissions_select_all" ON permissions FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "permissions_insert_owner" ON permissions FOR INSERT TO authenticated WITH CHECK (is_owner())';
    EXECUTE 'CREATE POLICY "permissions_update_owner" ON permissions FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner())';
    EXECUTE 'CREATE POLICY "permissions_delete_owner" ON permissions FOR DELETE TO authenticated USING (is_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    EXECUTE 'CREATE POLICY "role_permissions_select_all" ON role_permissions FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "role_permissions_insert_owner" ON role_permissions FOR INSERT TO authenticated WITH CHECK (is_owner())';
    EXECUTE 'CREATE POLICY "role_permissions_delete_owner" ON role_permissions FOR DELETE TO authenticated USING (is_owner())';
  END IF;
END $$;

-- =====================================================
-- PART 13: SECURE RLS POLICIES FOR OTHER TABLES
-- =====================================================

CREATE POLICY "order_stages_select_staff" ON order_stages FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "order_stages_insert_admin" ON order_stages FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner());
CREATE POLICY "order_stages_update_admin" ON order_stages FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());
CREATE POLICY "order_stages_delete_admin" ON order_stages FOR DELETE TO authenticated USING (is_admin_or_owner());

CREATE POLICY "order_history_select_staff" ON order_history FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "order_history_insert_staff" ON order_history FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "order_history_delete_admin" ON order_history FOR DELETE TO authenticated USING (is_admin_or_owner());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    EXECUTE 'CREATE POLICY "suppliers_select_staff" ON suppliers FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "suppliers_insert_staff" ON suppliers FOR INSERT TO authenticated WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "suppliers_update_staff" ON suppliers FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "suppliers_delete_admin" ON suppliers FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliveries') THEN
    EXECUTE 'CREATE POLICY "deliveries_select_staff" ON deliveries FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "deliveries_insert_staff" ON deliveries FOR INSERT TO authenticated WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "deliveries_update_staff" ON deliveries FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "deliveries_delete_admin" ON deliveries FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
    EXECUTE 'CREATE POLICY "services_select_staff" ON services FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "services_insert_admin" ON services FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "services_update_admin" ON services FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "services_delete_admin" ON services FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_types') THEN
    EXECUTE 'CREATE POLICY "repair_types_select_staff" ON repair_types FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "repair_types_insert_admin" ON repair_types FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "repair_types_update_admin" ON repair_types FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "repair_types_delete_admin" ON repair_types FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    EXECUTE 'CREATE POLICY "purchase_orders_select_staff" ON purchase_orders FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "purchase_orders_insert_staff" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "purchase_orders_update_staff" ON purchase_orders FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "purchase_orders_delete_admin" ON purchase_orders FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN
    EXECUTE 'CREATE POLICY "purchase_order_items_select_staff" ON purchase_order_items FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "purchase_order_items_insert_staff" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "purchase_order_items_update_staff" ON purchase_order_items FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "purchase_order_items_delete_staff" ON purchase_order_items FOR DELETE TO authenticated USING (is_staff())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
    EXECUTE 'CREATE POLICY "locations_select_staff" ON locations FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "locations_insert_admin" ON locations FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "locations_update_admin" ON locations FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "locations_delete_owner" ON locations FOR DELETE TO authenticated USING (is_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_brands') THEN
    EXECUTE 'CREATE POLICY "device_brands_select_all" ON device_brands FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "device_brands_insert_staff" ON device_brands FOR INSERT TO authenticated WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "device_brands_update_admin" ON device_brands FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "device_brands_delete_admin" ON device_brands FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_models') THEN
    EXECUTE 'CREATE POLICY "device_models_select_all" ON device_models FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "device_models_insert_staff" ON device_models FOR INSERT TO authenticated WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "device_models_update_admin" ON device_models FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "device_models_delete_admin" ON device_models FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    EXECUTE 'CREATE POLICY "tasks_select_staff" ON tasks FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "tasks_insert_staff" ON tasks FOR INSERT TO authenticated WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "tasks_update_assigned_or_admin" ON tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid() OR is_admin_or_owner()) WITH CHECK (assigned_to = auth.uid() OR is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "tasks_delete_admin" ON tasks FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    EXECUTE 'CREATE POLICY "invoices_select_staff" ON invoices FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "invoices_insert_staff" ON invoices FOR INSERT TO authenticated WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "invoices_update_staff" ON invoices FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff())';
    EXECUTE 'CREATE POLICY "invoices_delete_admin" ON invoices FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
    EXECUTE 'CREATE POLICY "announcements_select_all" ON announcements FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "announcements_insert_admin" ON announcements FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "announcements_update_admin" ON announcements FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "announcements_delete_admin" ON announcements FOR DELETE TO authenticated USING (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcement_reads') THEN
    EXECUTE 'CREATE POLICY "announcement_reads_select_own" ON announcement_reads FOR SELECT TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "announcement_reads_insert_own" ON announcement_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_audits') THEN
    EXECUTE 'CREATE POLICY "inventory_audits_select_staff" ON inventory_audits FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "inventory_audits_insert_admin" ON inventory_audits FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "inventory_audits_update_admin" ON inventory_audits FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_audit_items') THEN
    EXECUTE 'CREATE POLICY "inventory_audit_items_select_staff" ON inventory_audit_items FOR SELECT TO authenticated USING (is_staff())';
    EXECUTE 'CREATE POLICY "inventory_audit_items_insert_admin" ON inventory_audit_items FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "inventory_audit_items_update_admin" ON inventory_audit_items FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner())';
  END IF;
END $$;

-- =====================================================
-- PART 14: FIX SECURITY DEFINER VIEWS
-- =====================================================

DROP VIEW IF EXISTS announcement_stats CASCADE;
CREATE VIEW announcement_stats
WITH (security_invoker = true)
AS
SELECT
  a.id,
  a.title,
  a.priority,
  a.created_at,
  COUNT(ar.user_id) as read_count,
  (SELECT COUNT(*) FROM profiles WHERE role IN ('owner', 'admin', 'technician')) as total_users
FROM announcements a
LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id
GROUP BY a.id, a.title, a.priority, a.created_at;

DROP VIEW IF EXISTS completed_orders_analytics CASCADE;
CREATE VIEW completed_orders_analytics
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.completed_at,
  o.final_cost,
  o.total_profit,
  o.assigned_to,
  p.full_name as technician_name,
  o.location_id
FROM orders o
LEFT JOIN profiles p ON o.assigned_to = p.id
WHERE o.completed_at IS NOT NULL;

DROP VIEW IF EXISTS audit_logs_with_user CASCADE;
CREATE VIEW audit_logs_with_user
WITH (security_invoker = true)
AS
SELECT
  al.*,
  p.full_name as user_name,
  p.role as user_role
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id;

-- =====================================================
-- PART 15: FIX FUNCTION SEARCH PATHS
-- =====================================================

DROP FUNCTION IF EXISTS update_order_totals() CASCADE;
CREATE FUNCTION update_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE orders
  SET
    subtotal = COALESCE((
      SELECT SUM(total_price)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ), 0),
    total_cost = COALESCE((
      SELECT SUM(unit_cost * quantity)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ), 0)
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP FUNCTION IF EXISTS calculate_order_profit() CASCADE;
CREATE FUNCTION calculate_order_profit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total_profit = COALESCE(NEW.subtotal, 0) - COALESCE(NEW.total_cost, 0);
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
CREATE FUNCTION generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_order_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM orders
  WHERE order_number LIKE 'ORD-%';

  new_order_number := 'ORD-' || LPAD(next_num::TEXT, 6, '0');
  NEW.order_number := new_order_number;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS update_inventory_stock() CASCADE;
CREATE FUNCTION update_inventory_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.movement_type = 'in' OR NEW.movement_type = 'transfer_in' THEN
    UPDATE inventory
    SET quantity = quantity + NEW.quantity
    WHERE id = NEW.inventory_id;
  ELSIF NEW.movement_type = 'out' OR NEW.movement_type = 'transfer_out' THEN
    UPDATE inventory
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.inventory_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS log_order_stage_change() CASCADE;
CREATE FUNCTION log_order_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT name INTO old_stage_name FROM order_stages WHERE id = OLD.stage_id;
    SELECT name INTO new_stage_name FROM order_stages WHERE id = NEW.stage_id;

    INSERT INTO order_history (order_id, user_id, event_type, description)
    VALUES (
      NEW.id,
      auth.uid(),
      'stage_change',
      'Stage changed from "' || COALESCE(old_stage_name, 'none') || '" to "' || new_stage_name || '"'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS calculate_item_profit() CASCADE;
CREATE FUNCTION calculate_item_profit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.profit = (NEW.unit_price - COALESCE(NEW.unit_cost, 0)) * NEW.quantity;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS log_audit_event() CASCADE;
CREATE FUNCTION log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operation_type TEXT;
  table_name_var TEXT;
BEGIN
  table_name_var := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    operation_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    operation_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    operation_type := 'delete';
  END IF;

  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    operation_type,
    table_name_var,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP FUNCTION IF EXISTS get_technician_performance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
CREATE FUNCTION get_technician_performance(
  technician_id UUID,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_orders BIGINT,
  completed_orders BIGINT,
  total_revenue NUMERIC,
  total_profit NUMERIC,
  avg_completion_time INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_orders,
    COUNT(*) FILTER (WHERE o.completed_at IS NOT NULL)::BIGINT as completed_orders,
    COALESCE(SUM(o.final_cost), 0) as total_revenue,
    COALESCE(SUM(o.total_profit), 0) as total_profit,
    AVG(o.completed_at - o.created_at) FILTER (WHERE o.completed_at IS NOT NULL) as avg_completion_time
  FROM orders o
  WHERE o.assigned_to = technician_id
    AND (start_date IS NULL OR o.created_at >= start_date)
    AND (end_date IS NULL OR o.created_at <= end_date);
END;
$$;

DROP FUNCTION IF EXISTS calculate_technician_bonus(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
CREATE FUNCTION calculate_technician_bonus(
  p_technician_id UUID,
  p_location_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  technician_id UUID,
  technician_name TEXT,
  total_orders BIGINT,
  completed_orders BIGINT,
  total_profit NUMERIC,
  bonus_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_profit NUMERIC;
  v_bonus_percentage NUMERIC := 0.10;
BEGIN
  SELECT
    COALESCE(SUM(o.total_profit), 0)
  INTO v_total_profit
  FROM orders o
  WHERE o.assigned_to = p_technician_id
    AND o.location_id = p_location_id
    AND o.completed_at >= p_start_date
    AND o.completed_at <= p_end_date
    AND o.completed_at IS NOT NULL;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    COUNT(o.id)::BIGINT,
    COUNT(o.id) FILTER (WHERE o.completed_at IS NOT NULL)::BIGINT,
    v_total_profit,
    (v_total_profit * v_bonus_percentage) as bonus
  FROM profiles p
  LEFT JOIN orders o ON o.assigned_to = p.id
    AND o.location_id = p_location_id
    AND o.completed_at >= p_start_date
    AND o.completed_at <= p_end_date
  WHERE p.id = p_technician_id
  GROUP BY p.id, p.full_name;
END;
$$;

-- =====================================================
-- PART 16: RECREATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_order_totals_trigger ON order_items;
CREATE TRIGGER update_order_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_totals();

DROP TRIGGER IF EXISTS calculate_order_profit_trigger ON orders;
CREATE TRIGGER calculate_order_profit_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_profit();

DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

DROP TRIGGER IF EXISTS update_inventory_stock_trigger ON inventory_movements;
CREATE TRIGGER update_inventory_stock_trigger
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_stock();

DROP TRIGGER IF EXISTS log_order_stage_change_trigger ON orders;
CREATE TRIGGER log_order_stage_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_stage_change();

DROP TRIGGER IF EXISTS calculate_item_profit_trigger ON order_items;
CREATE TRIGGER calculate_item_profit_trigger
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_item_profit();

-- =====================================================
-- PART 17: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_technician_performance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_technician_bonus(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
-- PART 18: ADD SECURITY DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION is_owner() IS 'Security helper: Returns true if current user is owner. SET search_path = public prevents SQL injection.';
COMMENT ON FUNCTION is_admin_or_owner() IS 'Security helper: Returns true if current user is admin or owner. SET search_path = public prevents SQL injection.';
COMMENT ON FUNCTION is_staff() IS 'Security helper: Returns true if current user is staff (owner, admin, or technician). SET search_path = public prevents SQL injection.';
COMMENT ON FUNCTION get_user_role() IS 'Security helper: Returns the role of the current user. SET search_path = public prevents SQL injection.';

COMMENT ON TABLE audit_logs IS 'Security: Insert by all authenticated users, read/delete by admins only. Ensures comprehensive audit trail while protecting sensitive data.';
COMMENT ON TABLE profiles IS 'Security: View own or if staff, modify own non-role fields or if admin. Prevents privilege escalation.';
COMMENT ON TABLE clients IS 'Security: Staff can manage, admins can delete. Protects customer data from unauthorized access.';
COMMENT ON TABLE orders IS 'Security: Staff can manage, admins can delete. Ensures only authorized personnel handle orders.';
COMMENT ON TABLE inventory IS 'Security: Staff can manage, admins can delete. Protects inventory from unauthorized modifications.';
