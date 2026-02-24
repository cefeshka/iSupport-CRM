-- Test data seeding for CRM demo
-- This creates sample customer and order data to demonstrate the premium UI

-- Insert test client
INSERT INTO clients (full_name, phone, email, traffic_source, notes)
VALUES
  ('Jānis Bērziņš', '+37126123456', 'janis.berzins@example.lv', 'Instagram', 'Test client for demo purposes')
ON CONFLICT DO NOTHING;

-- Get the client ID (use first available client if insert fails)
DO $$
DECLARE
  v_client_id UUID;
  v_location_id UUID;
  v_stage_id UUID;
  v_user_id UUID;
  v_order_id UUID;
BEGIN
  -- Get first client
  SELECT id INTO v_client_id FROM clients LIMIT 1;

  -- Get first location
  SELECT id INTO v_location_id FROM locations LIMIT 1;

  -- Get first stage (preferably "Новый" or first available)
  SELECT id INTO v_stage_id FROM order_stages ORDER BY position LIMIT 1;

  -- Get first user
  SELECT id INTO v_user_id FROM profiles LIMIT 1;

  -- Only proceed if we have all required IDs
  IF v_client_id IS NOT NULL AND v_location_id IS NOT NULL AND v_stage_id IS NOT NULL THEN
    -- Insert test order
    INSERT INTO orders (
      client_id,
      location_id,
      stage_id,
      device_type,
      device_model,
      device_color,
      device_imei,
      issue_description,
      priority,
      estimated_cost,
      prepayment,
      technician_notes,
      created_by
    )
    VALUES (
      v_client_id,
      v_location_id,
      v_stage_id,
      'iPhone',
      'iPhone 14 Pro',
      'Space Gray',
      '123456789012345',
      'Треснутый экран, не работает Face ID. Клиент упустил телефон с высоты 1.5 метра.',
      'high',
      250.00,
      50.00,
      'Требуется полная замена дисплея и диагностика Face ID модуля',
      v_user_id
    )
    RETURNING id INTO v_order_id;

    -- Add some order items if order was created
    IF v_order_id IS NOT NULL THEN
      -- Add service item
      INSERT INTO order_items (
        order_id,
        item_type,
        description,
        quantity,
        unit_cost,
        selling_price,
        warranty_months
      )
      VALUES (
        v_order_id,
        'service',
        'Замена дисплея iPhone 14 Pro',
        1,
        120.00,
        200.00,
        3
      );

      -- Add inventory item if inventory exists
      IF EXISTS (SELECT 1 FROM inventory LIMIT 1) THEN
        INSERT INTO order_items (
          order_id,
          item_type,
          description,
          quantity,
          unit_cost,
          selling_price,
          inventory_id
        )
        SELECT
          v_order_id,
          'inventory',
          'Защитное стекло iPhone 14 Pro',
          1,
          5.00,
          15.00,
          id
        FROM inventory
        LIMIT 1;
      END IF;
    END IF;

    RAISE NOTICE 'Test data created successfully!';
    RAISE NOTICE 'Client: Jānis Bērziņš';
    RAISE NOTICE 'Order: iPhone 14 Pro repair';
  ELSE
    RAISE NOTICE 'Cannot create test data: missing required records in database';
  END IF;
END $$;
