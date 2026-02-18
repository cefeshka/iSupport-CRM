/*
  # Fix Order Totals Trigger v2
  
  ## Overview
  Updates the trigger to properly calculate all order totals including total_cost.
  
  ## Changes
  - Updates update_order_totals() function to set both total_cost and estimated_cost
  - total_cost = subtotal - total_discount (the actual order total)
  - Ensures all financial fields are properly calculated
*/

-- Update function to calculate all totals properly
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  order_subtotal decimal;
  order_discount decimal;
  order_profit decimal;
BEGIN
  -- Calculate subtotal (sum of all item prices * quantities before discount)
  SELECT COALESCE(SUM(unit_price * quantity), 0)
  INTO order_subtotal
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Calculate total discount
  SELECT COALESCE(SUM(
    CASE 
      WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
      ELSE discount_value
    END
  ), 0)
  INTO order_discount
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Calculate estimated profit (price - cost for all items after discount)
  SELECT COALESCE(SUM(
    (unit_price - unit_cost) * quantity - 
    CASE 
      WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
      ELSE discount_value
    END
  ), 0)
  INTO order_profit
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Update order with calculated values
  UPDATE orders
  SET 
    subtotal = order_subtotal,
    total_discount = order_discount,
    total_cost = order_subtotal - order_discount,
    estimated_cost = order_subtotal - order_discount,
    estimated_profit = order_profit
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;