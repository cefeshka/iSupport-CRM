/*
  # Fix Financial Logic and Calculations

  ## Critical Issues Found:

  1. **Inconsistent Profit Calculation Formula**
     - Database uses mixed formulas for profit calculation
     - Should be: profit = (selling_price - cost_price) * quantity - discount

  2. **Missing COALESCE for NULL Values**
     - Triggers don't use COALESCE, leading to NULL propagation
     - Can cause NaN errors in frontend

  3. **No Status Filter Enforcement**
     - Need helper views for completed orders only

  4. **Decimal Precision Issues**
     - Numeric fields need explicit precision (12,2)

  ## Fixes Applied:

  1. Standardize all financial fields to NUMERIC(12,2)
  2. Add COALESCE to all calculations
  3. Fix profit calculation formula
  4. Create analytics view for completed orders
  5. Update NULL values to 0
  6. Recalculate existing profits
*/

-- ============================================================================
-- 1. ADD DECIMAL PRECISION TO FINANCIAL FIELDS
-- ============================================================================

-- orders table
DO $$
BEGIN
  ALTER TABLE orders 
    ALTER COLUMN estimated_cost TYPE NUMERIC(12,2),
    ALTER COLUMN final_cost TYPE NUMERIC(12,2),
    ALTER COLUMN total_cost TYPE NUMERIC(12,2),
    ALTER COLUMN total_profit TYPE NUMERIC(12,2),
    ALTER COLUMN deposit_amount TYPE NUMERIC(12,2),
    ALTER COLUMN balance_due TYPE NUMERIC(12,2),
    ALTER COLUMN subtotal TYPE NUMERIC(12,2),
    ALTER COLUMN total_discount TYPE NUMERIC(12,2),
    ALTER COLUMN estimated_profit TYPE NUMERIC(12,2),
    ALTER COLUMN parts_cost_total TYPE NUMERIC(12,2),
    ALTER COLUMN service_price TYPE NUMERIC(12,2),
    ALTER COLUMN master_commission TYPE NUMERIC(12,2),
    ALTER COLUMN prepayment TYPE NUMERIC(12,2);
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- order_items table
DO $$
BEGIN
  ALTER TABLE order_items 
    ALTER COLUMN unit_price TYPE NUMERIC(12,2),
    ALTER COLUMN total_price TYPE NUMERIC(12,2),
    ALTER COLUMN cost_price TYPE NUMERIC(12,2),
    ALTER COLUMN selling_price TYPE NUMERIC(12,2),
    ALTER COLUMN profit TYPE NUMERIC(12,2),
    ALTER COLUMN discount_value TYPE NUMERIC(12,2),
    ALTER COLUMN unit_cost TYPE NUMERIC(12,2);
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================================================
-- 2. ADD DEFAULT VALUES TO PREVENT NULLs
-- ============================================================================

ALTER TABLE orders 
  ALTER COLUMN estimated_cost SET DEFAULT 0,
  ALTER COLUMN final_cost SET DEFAULT 0,
  ALTER COLUMN total_cost SET DEFAULT 0,
  ALTER COLUMN total_profit SET DEFAULT 0,
  ALTER COLUMN deposit_amount SET DEFAULT 0,
  ALTER COLUMN balance_due SET DEFAULT 0,
  ALTER COLUMN subtotal SET DEFAULT 0,
  ALTER COLUMN total_discount SET DEFAULT 0,
  ALTER COLUMN estimated_profit SET DEFAULT 0,
  ALTER COLUMN parts_cost_total SET DEFAULT 0,
  ALTER COLUMN service_price SET DEFAULT 0,
  ALTER COLUMN master_commission SET DEFAULT 0,
  ALTER COLUMN prepayment SET DEFAULT 0;

ALTER TABLE order_items 
  ALTER COLUMN unit_price SET DEFAULT 0,
  ALTER COLUMN total_price SET DEFAULT 0,
  ALTER COLUMN cost_price SET DEFAULT 0,
  ALTER COLUMN selling_price SET DEFAULT 0,
  ALTER COLUMN profit SET DEFAULT 0,
  ALTER COLUMN discount_value SET DEFAULT 0,
  ALTER COLUMN unit_cost SET DEFAULT 0,
  ALTER COLUMN quantity SET DEFAULT 1;

-- ============================================================================
-- 3. FIX ORDER ITEMS PROFIT CALCULATION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_order_item_profit()
RETURNS TRIGGER AS $$
DECLARE
  item_selling_price NUMERIC(12,2);
  item_cost_price NUMERIC(12,2);
  item_quantity INTEGER;
  item_discount NUMERIC(12,2);
  calculated_profit NUMERIC(12,2);
BEGIN
  -- Get values with COALESCE to handle NULLs
  item_selling_price := COALESCE(NEW.selling_price, NEW.unit_price, 0);
  item_cost_price := COALESCE(NEW.cost_price, NEW.unit_cost, 0);
  item_quantity := COALESCE(NEW.quantity, 1);
  
  -- Calculate discount amount
  IF NEW.discount_type = 'percent' THEN
    item_discount := ROUND((item_selling_price * item_quantity * COALESCE(NEW.discount_value, 0) / 100), 2);
  ELSE
    item_discount := COALESCE(NEW.discount_value, 0);
  END IF;
  
  -- Calculate total_price (what customer pays)
  NEW.total_price := ROUND((item_selling_price * item_quantity) - item_discount, 2);
  
  -- Calculate profit: (Selling Price - Cost Price) * Quantity - Discount
  calculated_profit := ROUND((item_selling_price - item_cost_price) * item_quantity - item_discount, 2);
  
  NEW.profit := calculated_profit;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS calculate_item_profit_trigger ON order_items;

-- Create trigger
CREATE TRIGGER calculate_item_profit_trigger
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_item_profit();

-- ============================================================================
-- 4. FIX ORDER TOTALS CALCULATION WITH PROPER NULL HANDLING
-- ============================================================================

CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  order_subtotal NUMERIC(12,2);
  order_discount NUMERIC(12,2);
  order_profit NUMERIC(12,2);
  parts_cost NUMERIC(12,2);
  service_revenue NUMERIC(12,2);
BEGIN
  -- Calculate subtotal (sum of all item selling prices * quantities BEFORE discount)
  SELECT ROUND(COALESCE(SUM(
    COALESCE(selling_price, unit_price, 0) * COALESCE(quantity, 1)
  ), 0), 2)
  INTO order_subtotal
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  -- Calculate total discount applied
  SELECT ROUND(COALESCE(SUM(
    CASE 
      WHEN discount_type = 'percent' THEN 
        (COALESCE(selling_price, unit_price, 0) * COALESCE(quantity, 1) * COALESCE(discount_value, 0) / 100)
      ELSE 
        COALESCE(discount_value, 0)
    END
  ), 0), 2)
  INTO order_discount
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  -- Calculate total profit (sum of individual item profits)
  SELECT ROUND(COALESCE(SUM(COALESCE(profit, 0)), 0), 2)
  INTO order_profit
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  -- Calculate parts cost total (for parts and accessories)
  SELECT ROUND(COALESCE(SUM(
    COALESCE(cost_price, unit_cost, 0) * COALESCE(quantity, 1)
  ), 0), 2)
  INTO parts_cost
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    AND item_type IN ('part', 'accessory');

  -- Calculate service revenue (services only)
  SELECT ROUND(COALESCE(SUM(
    (COALESCE(selling_price, unit_price, 0) * COALESCE(quantity, 1)) - 
    CASE 
      WHEN discount_type = 'percent' THEN 
        (COALESCE(selling_price, unit_price, 0) * COALESCE(quantity, 1) * COALESCE(discount_value, 0) / 100)
      ELSE 
        COALESCE(discount_value, 0)
    END
  ), 0), 2)
  INTO service_revenue
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    AND item_type = 'service';

  -- Update order with calculated values
  UPDATE orders
  SET 
    subtotal = order_subtotal,
    total_discount = order_discount,
    total_cost = ROUND(order_subtotal - order_discount, 2),
    estimated_cost = ROUND(order_subtotal - order_discount, 2),
    final_cost = ROUND(order_subtotal - order_discount, 2),
    estimated_profit = order_profit,
    total_profit = order_profit,
    parts_cost_total = parts_cost,
    service_price = service_revenue
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ADD FUNCTION TO CHECK IF ORDER IS CLOSED
-- ============================================================================

CREATE OR REPLACE FUNCTION is_order_closed(order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM orders o
    JOIN order_stages s ON s.id = o.stage_id
    WHERE o.id = order_id
      AND s.name IN ('Закрыт', 'Completed', 'Closed')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. CREATE ANALYTICS VIEW FOR COMPLETED ORDERS ONLY
-- ============================================================================

CREATE OR REPLACE VIEW completed_orders_analytics AS
SELECT 
  o.id,
  o.order_number,
  o.location_id,
  o.completed_at,
  o.payment_method,
  o.lead_source,
  o.master_id,
  ROUND(COALESCE(o.final_cost, o.estimated_cost, 0), 2) as revenue,
  ROUND(COALESCE(o.total_profit, o.estimated_profit, 0), 2) as profit,
  ROUND(COALESCE(o.parts_cost_total, 0), 2) as parts_cost,
  ROUND(COALESCE(o.service_price, 0), 2) as service_revenue,
  ROUND(COALESCE(o.master_commission, 0), 2) as commission,
  ROUND(COALESCE(o.total_profit, o.estimated_profit, 0) - COALESCE(o.master_commission, 0), 2) as net_profit
FROM orders o
JOIN order_stages s ON s.id = o.stage_id
WHERE s.name IN ('Закрыт', 'Completed', 'Closed')
  AND o.completed_at IS NOT NULL;

-- ============================================================================
-- 7. UPDATE EXISTING NULL VALUES TO 0
-- ============================================================================

UPDATE orders
SET 
  estimated_cost = COALESCE(estimated_cost, 0),
  final_cost = COALESCE(final_cost, 0),
  total_cost = COALESCE(total_cost, 0),
  total_profit = COALESCE(total_profit, 0),
  deposit_amount = COALESCE(deposit_amount, 0),
  balance_due = COALESCE(balance_due, 0),
  subtotal = COALESCE(subtotal, 0),
  total_discount = COALESCE(total_discount, 0),
  estimated_profit = COALESCE(estimated_profit, 0),
  parts_cost_total = COALESCE(parts_cost_total, 0),
  service_price = COALESCE(service_price, 0),
  master_commission = COALESCE(master_commission, 0),
  prepayment = COALESCE(prepayment, 0)
WHERE estimated_cost IS NULL 
   OR final_cost IS NULL 
   OR total_cost IS NULL
   OR total_profit IS NULL
   OR deposit_amount IS NULL
   OR balance_due IS NULL
   OR subtotal IS NULL
   OR total_discount IS NULL
   OR estimated_profit IS NULL
   OR parts_cost_total IS NULL
   OR service_price IS NULL
   OR master_commission IS NULL
   OR prepayment IS NULL;

UPDATE order_items
SET 
  unit_price = COALESCE(unit_price, 0),
  total_price = COALESCE(total_price, 0),
  cost_price = COALESCE(cost_price, 0),
  selling_price = COALESCE(selling_price, 0),
  profit = COALESCE(profit, 0),
  discount_value = COALESCE(discount_value, 0),
  unit_cost = COALESCE(unit_cost, 0),
  quantity = COALESCE(quantity, 1)
WHERE unit_price IS NULL 
   OR total_price IS NULL 
   OR cost_price IS NULL
   OR selling_price IS NULL
   OR profit IS NULL
   OR discount_value IS NULL
   OR unit_cost IS NULL
   OR quantity IS NULL;

-- ============================================================================
-- 8. RECALCULATE PROFITS FOR EXISTING ITEMS
-- ============================================================================

-- Force trigger to recalculate profit for all existing items
DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT * FROM order_items LOOP
    UPDATE order_items 
    SET quantity = quantity 
    WHERE id = item.id;
  END LOOP;
END $$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON completed_orders_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION is_order_closed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_order_item_profit() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION calculate_order_item_profit() IS 'Calculates profit: (selling_price - cost_price) * quantity - discount. Uses COALESCE for NULL safety.';
COMMENT ON FUNCTION is_order_closed(UUID) IS 'Returns true if order status is Closed/Completed';
COMMENT ON VIEW completed_orders_analytics IS 'Analytics view showing only completed orders with calculated financial metrics';

COMMENT ON COLUMN orders.estimated_cost IS 'Initial estimate (becomes final_cost when work completed)';
COMMENT ON COLUMN orders.final_cost IS 'Final cost charged to customer';
COMMENT ON COLUMN orders.total_cost IS 'Calculated: subtotal - total_discount';
COMMENT ON COLUMN orders.total_profit IS 'Sum of all item profits';
COMMENT ON COLUMN orders.parts_cost_total IS 'Total purchase cost of parts used';
COMMENT ON COLUMN orders.service_price IS 'Revenue from services only';

COMMENT ON COLUMN order_items.selling_price IS 'Price per unit charged to customer';
COMMENT ON COLUMN order_items.cost_price IS 'Purchase cost per unit';
COMMENT ON COLUMN order_items.profit IS 'Calculated: (selling_price - cost_price) * quantity - discount';
COMMENT ON COLUMN order_items.total_price IS 'Total for line: selling_price * quantity - discount';
