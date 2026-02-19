/*
  # Create Access Helper Function and Fix RLS Policies (Corrected)

  1. Purpose
    - Create can_access_location helper function
    - Replace policies with `true` conditions with proper security checks
  
  2. Changes
    - Creates can_access_location(loc_id) helper function
    - Updates all policies that had USING (true) or WITH CHECK (true)
    - Only applies location checks to tables that actually have location_id:
      clients, orders, inventory, purchase_orders, invoices
*/

-- Create helper function to check if user can access location
CREATE OR REPLACE FUNCTION can_access_location(loc_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      role IN ('admin', 'owner')
      OR location_id = loc_id
    )
  );
$$;

-- ANNOUNCEMENT_READS: Only users can mark their own reads
DROP POLICY IF EXISTS "announcement_reads_insert" ON announcement_reads;
CREATE POLICY "announcement_reads_insert"
  ON announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- CLIENTS: Check location access
DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND can_access_location(location_id)
  );

DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update"
  ON clients FOR UPDATE
  TO authenticated
  USING (can_access_location(location_id))
  WITH CHECK (can_access_location(location_id));

-- COMMUNICATIONS: Only for assigned staff or related to user's orders
DROP POLICY IF EXISTS "Authenticated users can create communications" ON communications;
CREATE POLICY "communications_insert_staff"
  ON communications FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = communications.order_id
      AND can_access_location(orders.location_id)
    )
  );

-- DELIVERIES: Staff can manage (no location_id)
DROP POLICY IF EXISTS "deliveries_insert" ON deliveries;
CREATE POLICY "deliveries_insert"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

DROP POLICY IF EXISTS "deliveries_update" ON deliveries;
CREATE POLICY "deliveries_update"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- DEVICE_BRANDS: Staff can modify (no location_id)
DROP POLICY IF EXISTS "device_brands_update" ON device_brands;
CREATE POLICY "device_brands_update"
  ON device_brands FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- DEVICE_MODELS: Staff can modify (no location_id)
DROP POLICY IF EXISTS "device_models_update" ON device_models;
CREATE POLICY "device_models_update"
  ON device_models FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- INVENTORY: Check location access
DROP POLICY IF EXISTS "inventory_insert" ON inventory;
CREATE POLICY "inventory_insert"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND can_access_location(location_id)
  );

DROP POLICY IF EXISTS "inventory_update" ON inventory;
CREATE POLICY "inventory_update"
  ON inventory FOR UPDATE
  TO authenticated
  USING (can_access_location(location_id))
  WITH CHECK (can_access_location(location_id));

-- INVENTORY_MOVEMENTS: Check location access
DROP POLICY IF EXISTS "inventory_movements_insert" ON inventory_movements;
CREATE POLICY "inventory_movements_insert"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND (
      can_access_location(location_id)
      OR (destination_location_id IS NOT NULL AND can_access_location(destination_location_id))
    )
  );

-- INVOICES: Check location access
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
CREATE POLICY "invoices_insert"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND can_access_location(location_id)
  );

-- ORDER_HISTORY: Track history for accessible orders
DROP POLICY IF EXISTS "order_history_insert" ON order_history;
CREATE POLICY "order_history_insert"
  ON order_history FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_history.order_id
      AND can_access_location(o.location_id)
    )
  );

-- ORDER_ITEMS: Check order location access
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND can_access_location(o.location_id)
    )
  );

DROP POLICY IF EXISTS "order_items_update" ON order_items;
CREATE POLICY "order_items_update"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND can_access_location(o.location_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND can_access_location(o.location_id)
    )
  );

-- ORDER_NOTIFICATIONS: Check order access
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON order_notifications;
CREATE POLICY "order_notifications_insert_staff"
  ON order_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_notifications.order_id
      AND can_access_location(o.location_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update notifications" ON order_notifications;
CREATE POLICY "order_notifications_update_staff"
  ON order_notifications FOR UPDATE
  TO authenticated
  USING (
    is_staff()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_notifications.order_id
      AND can_access_location(o.location_id)
    )
  )
  WITH CHECK (
    is_staff()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_notifications.order_id
      AND can_access_location(o.location_id)
    )
  );

-- ORDER_PHOTOS: Check order access, uploader can delete own
DROP POLICY IF EXISTS "Authenticated users can delete order photos" ON order_photos;
CREATE POLICY "order_photos_delete_own"
  ON order_photos FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upload order photos" ON order_photos;
CREATE POLICY "order_photos_insert_staff"
  ON order_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND is_staff()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_photos.order_id
      AND can_access_location(o.location_id)
    )
  );

-- ORDERS: Check location access
DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND can_access_location(location_id)
  );

DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update"
  ON orders FOR UPDATE
  TO authenticated
  USING (can_access_location(location_id))
  WITH CHECK (can_access_location(location_id));

-- PURCHASE_ORDER_ITEMS: Check purchase order access
DROP POLICY IF EXISTS "purchase_order_items_insert" ON purchase_order_items;
CREATE POLICY "purchase_order_items_insert"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
      AND can_access_location(po.location_id)
    )
  );

DROP POLICY IF EXISTS "purchase_order_items_update" ON purchase_order_items;
CREATE POLICY "purchase_order_items_update"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
      AND can_access_location(po.location_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
      AND can_access_location(po.location_id)
    )
  );

-- PURCHASE_ORDERS: Check location access
DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
CREATE POLICY "purchase_orders_insert"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND can_access_location(location_id)
  );

DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;
CREATE POLICY "purchase_orders_update"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (can_access_location(location_id))
  WITH CHECK (can_access_location(location_id));

-- REPAIR_TYPES: Staff can modify (no location_id)
DROP POLICY IF EXISTS "repair_types_insert" ON repair_types;
CREATE POLICY "repair_types_insert"
  ON repair_types FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

DROP POLICY IF EXISTS "repair_types_update" ON repair_types;
CREATE POLICY "repair_types_update"
  ON repair_types FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- SERVICES: Staff can modify (no location_id)
DROP POLICY IF EXISTS "services_insert" ON services;
CREATE POLICY "services_insert"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

DROP POLICY IF EXISTS "services_update" ON services;
CREATE POLICY "services_update"
  ON services FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- TASKS: Check assignment or location access
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff()
    AND (
      EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = tasks.order_id
        AND can_access_location(o.location_id)
      )
      OR order_id IS NULL
    )
  );
