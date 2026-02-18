/*
  # Fix Profit Calculation by Item Type
  
  ## Overview
  Updates profit calculation to properly handle different item types:
  - Parts (детали): Cost-based profit calculation (price - cost)
  - Services (работа): Full price as profit (no cost)
  
  ## Changes
  1. Updates the order totals trigger to calculate profit based on item type
  2. For parts/accessories: profit = (unit_price - unit_cost) * quantity - discount
  3. For services: profit = unit_price * quantity - discount (no cost deduction)
  
  ## Security
  - No security changes
*/

-- Update function to calculate profit based on item type
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
  
  -- Calculate estimated profit based on item type
  -- For services: full price after discount is profit
  -- For parts/accessories: profit = (price - cost) after discount
  SELECT COALESCE(SUM(
    CASE
      WHEN item_type = 'service' THEN
        -- Services: full price is profit (no cost deduction)
        unit_price * quantity - 
        CASE 
          WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
          ELSE discount_value
        END
      ELSE
        -- Parts/accessories: subtract cost from price
        (unit_price - unit_cost) * quantity - 
        CASE 
          WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
          ELSE discount_value
        END
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

-- Recalculate all existing orders with new logic
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
    
    -- Calculate estimated profit by item type
    SELECT COALESCE(SUM(
      CASE
        WHEN item_type = 'service' THEN
          unit_price * quantity - 
          CASE 
            WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
            ELSE discount_value
          END
        ELSE
          (unit_price - unit_cost) * quantity - 
          CASE 
            WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
            ELSE discount_value
          END
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