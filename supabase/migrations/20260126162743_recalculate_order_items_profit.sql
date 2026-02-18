/*
  # Recalculate Order Items Profit
  
  ## Overview
  Recalculates profit for all existing order items based on item type:
  - Services: full price after discount
  - Parts/accessories: (price - cost) after discount
  
  ## Changes
  - Updates profit field for all order_items based on item_type
*/

-- Recalculate profit for all existing order items
UPDATE order_items
SET profit = CASE
  WHEN item_type = 'service' THEN
    -- Services: full price is profit
    unit_price * quantity - 
    CASE 
      WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
      ELSE discount_value
    END
  ELSE
    -- Parts/accessories: subtract cost
    (unit_price - unit_cost) * quantity - 
    CASE 
      WHEN discount_type = 'percent' THEN (unit_price * quantity * discount_value / 100)
      ELSE discount_value
    END
END
WHERE id IS NOT NULL;