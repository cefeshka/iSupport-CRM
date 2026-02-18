/*
  # Fix Inventory Movements to Show Order Number
  
  ## Overview
  Updates inventory movement tracking to display actual order numbers (e.g., 'A13', 'ORD-001')
  instead of generic messages or order IDs.
  
  ## Changes
  
  ### 1. Updated Functions
  - `reserve_inventory_stock()`: Now fetches and includes order_number in notes field
  - `return_inventory_stock()`: Now fetches and includes order_number in notes field
  
  ### 2. Notes Format
  - Sale/Outcome: "Used in order {order_number}"
  - Return/Adjustment: "Returned from order {order_number}"
  
  ## Impact
  All new inventory movements will automatically show readable order numbers
  in their notes field for better traceability.
*/

-- Updated function to reserve inventory stock with order number
CREATE OR REPLACE FUNCTION reserve_inventory_stock(
  p_order_item_id uuid,
  p_inventory_id uuid,
  p_quantity integer,
  p_order_id uuid
) RETURNS void AS $$
DECLARE
  v_order_number text;
BEGIN
  -- Get the order number
  SELECT order_number INTO v_order_number
  FROM orders
  WHERE id = p_order_id;
  
  -- Deduct from inventory
  UPDATE inventory
  SET quantity = quantity - p_quantity
  WHERE id = p_inventory_id;
  
  -- Mark as reserved
  UPDATE order_items
  SET stock_reserved = true
  WHERE id = p_order_item_id;
  
  -- Create movement record with order number
  INSERT INTO inventory_movements (
    inventory_id,
    order_id,
    user_id,
    movement_type,
    quantity,
    notes
  ) VALUES (
    p_inventory_id,
    p_order_id,
    auth.uid(),
    'sale',
    -p_quantity,
    CASE 
      WHEN v_order_number IS NOT NULL THEN 'Used in order ' || v_order_number
      ELSE 'Used in order (no number assigned)'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to return inventory stock with order number
CREATE OR REPLACE FUNCTION return_inventory_stock(
  p_inventory_id uuid,
  p_quantity integer,
  p_order_id uuid
) RETURNS void AS $$
DECLARE
  v_order_number text;
BEGIN
  -- Get the order number
  SELECT order_number INTO v_order_number
  FROM orders
  WHERE id = p_order_id;
  
  -- Return to inventory
  UPDATE inventory
  SET quantity = quantity + p_quantity
  WHERE id = p_inventory_id;
  
  -- Create movement record with order number
  INSERT INTO inventory_movements (
    inventory_id,
    order_id,
    user_id,
    movement_type,
    quantity,
    notes
  ) VALUES (
    p_inventory_id,
    p_order_id,
    auth.uid(),
    'adjustment',
    p_quantity,
    CASE 
      WHEN v_order_number IS NOT NULL THEN 'Returned from order ' || v_order_number
      ELSE 'Returned from order (no number assigned)'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
