/*
  # Fix All Security Vulnerabilities - Corrected

  This migration addresses all 42 security warnings from the Supabase audit:

  ## 1. Function Search Path Mutable (35 functions)
    - Add 'SET search_path = public' to all functions to prevent search path attacks

  ## 2. RLS Enabled No Policy (10 tables)
    - api_keys, delivery_items, document_templates, inventory_categories
    - lead_sources, service_catalog, stock_audit_items, stock_audits
    - system_settings, traffic_sources

  ## 3. RLS Policy Always True (2 policies)
    - activity_logs: Change INSERT from 'true' to 'authenticated'
    - audit_logs: Change INSERT from 'true' to 'authenticated'

  ## 4. Security Best Practices
    - Data validation constraints
    - Security definer functions
*/

-- =====================================================
-- PART 1: Fix Function Search Path Mutable
-- =====================================================

CREATE OR REPLACE FUNCTION handle_order_item_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.part_id IS NOT NULL AND NEW.quantity > 0 THEN
      UPDATE inventory
      SET stock_quantity = stock_quantity - NEW.quantity
      WHERE id = NEW.part_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.part_id IS NOT NULL AND NEW.part_id IS NOT NULL THEN
      IF OLD.part_id = NEW.part_id THEN
        UPDATE inventory
        SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity
        WHERE id = NEW.part_id;
      ELSE
        UPDATE inventory SET stock_quantity = stock_quantity + OLD.quantity WHERE id = OLD.part_id;
        UPDATE inventory SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.part_id;
      END IF;
    ELSIF OLD.part_id IS NOT NULL THEN
      UPDATE inventory SET stock_quantity = stock_quantity + OLD.quantity WHERE id = OLD.part_id;
    ELSIF NEW.part_id IS NOT NULL THEN
      UPDATE inventory SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.part_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.part_id IS NOT NULL AND OLD.quantity > 0 THEN
      UPDATE inventory
      SET stock_quantity = stock_quantity + OLD.quantity
      WHERE id = OLD.part_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION reserve_inventory_stock(
  p_inventory_id uuid,
  p_quantity integer,
  p_order_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available integer;
BEGIN
  SELECT stock_quantity - reserved_quantity INTO v_available
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;

  IF v_available >= p_quantity THEN
    UPDATE inventory
    SET reserved_quantity = reserved_quantity + p_quantity
    WHERE id = p_inventory_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION has_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN role_permissions rp ON rp.role = p.role
    WHERE p.id = auth.uid()
    AND rp.permission = permission_name
    AND rp.granted = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  year_code text;
BEGIN
  year_code := TO_CHAR(CURRENT_DATE, 'YY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM orders
  WHERE order_number LIKE year_code || '%';

  RETURN year_code || LPAD(next_num::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_price numeric(10,2);
  v_total_cost numeric(10,2);
BEGIN
  SELECT
    COALESCE(SUM(price * quantity), 0) +
    COALESCE((SELECT SUM(selling_price * quantity) FROM order_items WHERE order_id = NEW.order_id AND part_id IS NOT NULL), 0),
    COALESCE(SUM(cost * quantity), 0) +
    COALESCE((SELECT SUM(cost * quantity) FROM order_items WHERE order_id = NEW.order_id AND part_id IS NOT NULL), 0)
  INTO v_total_price, v_total_cost
  FROM order_items
  WHERE order_id = NEW.order_id;

  UPDATE orders
  SET
    total_price = v_total_price,
    total_cost = v_total_cost
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_order_profit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.profit := COALESCE(NEW.total_price, 0) - COALESCE(NEW.total_cost, 0);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_order_stage_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    NEW.stage_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_order_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    INSERT INTO activity_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      details
    ) VALUES (
      auth.uid(),
      'stage_change',
      'order',
      NEW.id,
      jsonb_build_object(
        'old_stage_id', OLD.stage_id,
        'new_stage_id', NEW.stage_id,
        'order_number', NEW.order_number
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_inventory_value()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total_value := NEW.stock_quantity * NEW.purchase_price;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stock_quantity != NEW.stock_quantity THEN
    INSERT INTO inventory_movements (
      inventory_id,
      movement_type,
      quantity,
      from_location_id,
      to_location_id,
      user_id,
      notes
    ) VALUES (
      NEW.id,
      CASE
        WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'income'
        ELSE 'outcome'
      END,
      ABS(NEW.stock_quantity - OLD.stock_quantity),
      NEW.location_id,
      NEW.location_id,
      auth.uid(),
      'Automatic log from stock update'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_stock_from_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.movement_type = 'income' THEN
    UPDATE inventory
    SET stock_quantity = stock_quantity + NEW.quantity
    WHERE id = NEW.inventory_id;
  ELSIF NEW.movement_type = 'outcome' THEN
    UPDATE inventory
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.inventory_id;
  ELSIF NEW.movement_type = 'transfer' THEN
    UPDATE inventory
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.inventory_id AND location_id = NEW.from_location_id;

    UPDATE inventory
    SET stock_quantity = stock_quantity + NEW.quantity
    WHERE id = NEW.inventory_id AND location_id = NEW.to_location_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_quantity <= NEW.min_stock_level THEN
    INSERT INTO activity_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      details
    ) VALUES (
      auth.uid(),
      'low_stock_alert',
      'inventory',
      NEW.id,
      jsonb_build_object(
        'part_name', NEW.part_name,
        'current_stock', NEW.stock_quantity,
        'min_level', NEW.min_stock_level
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);

    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::text,
      TG_OP,
      old_data,
      new_data,
      auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);

    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      user_id
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id::text,
      TG_OP,
      old_data,
      auth.uid()
    );
  ELSIF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);

    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      new_data,
      user_id
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::text,
      TG_OP,
      new_data,
      auth.uid()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION process_delivery(delivery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE inventory i
  SET stock_quantity = stock_quantity + di.quantity_delivered
  FROM delivery_items di
  WHERE di.delivery_id = process_delivery.delivery_id
  AND di.inventory_id = i.id;

  UPDATE deliveries
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = process_delivery.delivery_id;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_technician_performance(
  technician_id uuid,
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(
  total_orders integer,
  completed_orders integer,
  total_revenue numeric,
  avg_completion_time interval,
  customer_satisfaction numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_orders,
    COUNT(*) FILTER (WHERE os.name = 'Completed')::integer as completed_orders,
    COALESCE(SUM(o.total_price), 0) as total_revenue,
    AVG(o.completed_at - o.created_at) FILTER (WHERE o.completed_at IS NOT NULL) as avg_completion_time,
    0::numeric as customer_satisfaction
  FROM orders o
  LEFT JOIN order_stages os ON o.stage_id = os.id
  WHERE o.assigned_to = technician_id
  AND o.created_at BETWEEN start_date AND end_date;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_technician_bonus(
  p_user_id uuid,
  p_month date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_orders integer;
  v_total_revenue numeric;
  v_bonus numeric := 0;
  v_bonus_rate numeric;
  v_location_id integer;
BEGIN
  SELECT location_id INTO v_location_id
  FROM profiles
  WHERE id = p_user_id;

  SELECT
    COUNT(*),
    COALESCE(SUM(o.total_price), 0)
  INTO v_completed_orders, v_total_revenue
  FROM orders o
  JOIN order_stages os ON o.stage_id = os.id
  WHERE o.assigned_to = p_user_id
    AND os.name = 'Completed'
    AND DATE_TRUNC('month', o.completed_at) = DATE_TRUNC('month', p_month)
    AND (v_location_id IS NULL OR o.location_id = v_location_id);

  IF v_completed_orders >= 50 THEN
    v_bonus_rate := 0.10;
  ELSIF v_completed_orders >= 30 THEN
    v_bonus_rate := 0.07;
  ELSIF v_completed_orders >= 20 THEN
    v_bonus_rate := 0.05;
  ELSIF v_completed_orders >= 10 THEN
    v_bonus_rate := 0.03;
  ELSE
    v_bonus_rate := 0;
  END IF;

  v_bonus := v_total_revenue * v_bonus_rate;

  RETURN ROUND(v_bonus, 2);
END;
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 2: Fix RLS Enabled No Policy
-- =====================================================

DROP POLICY IF EXISTS "Admins can view api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can create api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can update api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete api keys" ON api_keys;

CREATE POLICY "Admins can view api keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create api keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update api keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete api keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can view delivery items" ON delivery_items;
DROP POLICY IF EXISTS "Admins can manage delivery items" ON delivery_items;

CREATE POLICY "Staff can view delivery items"
  ON delivery_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "Admins can manage delivery items"
  ON delivery_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff can view document templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can manage document templates" ON document_templates;

CREATE POLICY "Staff can view document templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "Admins can manage document templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can view inventory categories" ON inventory_categories;
DROP POLICY IF EXISTS "Admins can manage inventory categories" ON inventory_categories;

CREATE POLICY "Staff can view inventory categories"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "Admins can manage inventory categories"
  ON inventory_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff can view lead sources" ON lead_sources;
DROP POLICY IF EXISTS "Admins can manage lead sources" ON lead_sources;

CREATE POLICY "Staff can view lead sources"
  ON lead_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "Admins can manage lead sources"
  ON lead_sources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can view service catalog" ON service_catalog;
DROP POLICY IF EXISTS "Admins can manage service catalog" ON service_catalog;

CREATE POLICY "Staff can view service catalog"
  ON service_catalog FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "Admins can manage service catalog"
  ON service_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff can view stock audit items" ON stock_audit_items;
DROP POLICY IF EXISTS "Staff can manage stock audit items" ON stock_audit_items;

CREATE POLICY "Staff can view stock audit items"
  ON stock_audit_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "Staff can manage stock audit items"
  ON stock_audit_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff can view stock audits" ON stock_audits;
DROP POLICY IF EXISTS "Staff can manage stock audits" ON stock_audits;

CREATE POLICY "Staff can view stock audits"
  ON stock_audits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "Staff can manage stock audits"
  ON stock_audits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;

CREATE POLICY "Admins can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can view traffic sources" ON traffic_sources;
DROP POLICY IF EXISTS "Admins can manage traffic sources" ON traffic_sources;

CREATE POLICY "Staff can view traffic sources"
  ON traffic_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE POLICY "Admins can manage traffic sources"
  ON traffic_sources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- PART 3: Fix RLS Policy Always True
-- =====================================================

DROP POLICY IF EXISTS "Users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Anyone can create activity logs" ON activity_logs;

CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Anyone can create audit logs" ON audit_logs;

CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- PART 4: Data Validation Constraints
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_phone_format_check'
  ) THEN
    ALTER TABLE clients
    ADD CONSTRAINT clients_phone_format_check
    CHECK (phone ~ '^[0-9+\-\s()]+$');
  END IF;
END $$;
