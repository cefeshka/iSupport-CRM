/*
  # Recalculate Existing Orders
  
  ## Overview
  Updates all existing orders to recalculate their totals based on order_items.
  This is needed because the trigger only fires on new changes, not on existing data.
  
  ## Changes
  - Manually recalculates subtotal, total_discount, and estimated_profit for all orders
  - Updates all orders with calculated values
*/

-- Recalculate totals for all existing orders
DO $$
DECLARE
  order_record RECORD;
  order_subtotal decimal;
  order_discount decimal;
  order_profit decimal;
BEGIN
  FOR order_record IN SELECT id FROM orders LOOP
    -- Calculate subtotal
    SELECT COALESCE(SUM(unit_price * quantity), 0)
    INTO order_subtotal
    FROM order_items
    WHERE order_id = order_record.id;
    
    -- Calculate total discount
    SELECT COALESCE(SUM(
      CASE 
        WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
        ELSE discount_value
      END
    ), 0)
    INTO order_discount
    FROM order_items
    WHERE order_id = order_record.id;
    
    -- Calculate estimated profit
    SELECT COALESCE(SUM(
      (unit_price - unit_cost) * quantity - 
      CASE 
        WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
        ELSE discount_value
      END
    ), 0)
    INTO order_profit
    FROM order_items
    WHERE order_id = order_record.id;
    
    -- Update order
    UPDATE orders
    SET 
      subtotal = order_subtotal,
      total_discount = order_discount,
      total_cost = order_subtotal - order_discount,
      estimated_profit = order_profit
    WHERE id = order_record.id;
  END LOOP;
END $$;