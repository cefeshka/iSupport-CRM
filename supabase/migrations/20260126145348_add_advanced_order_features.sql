/*
  # Add Advanced Order Features
  
  ## Overview
  This migration adds advanced features to the order management system inspired by professional ticket systems.
  
  ## Changes
  
  ### 1. Order Items Enhancement
  Add new columns to order_items table:
  - warranty_days: Warranty period in days
  - warranty_months: Warranty period in months
  - discount_type: Type of discount ('percent' or 'fixed')
  - discount_value: Discount amount (percentage or fixed amount)
  - assigned_technician_id: Which user/technician is assigned to this item
  - item_comment: Comment/note for this specific item
  - unit_cost: Cost per unit (for profit calculation)
  
  ### 2. Orders Enhancement
  Add new columns to orders table:
  - technician_notes: Internal notes for technicians
  - client_recommendations: Recommendations/conclusions for client
  - subtotal: Subtotal before discounts
  - total_discount: Total discount amount
  - estimated_profit: Calculated profit
  
  ### 3. Safety
  All alterations use IF NOT EXISTS checks to prevent errors on re-run
*/

-- Add new columns to order_items if they don't exist
DO $$
BEGIN
  -- Warranty days
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'warranty_days'
  ) THEN
    ALTER TABLE order_items ADD COLUMN warranty_days integer DEFAULT 0;
  END IF;
  
  -- Warranty months
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'warranty_months'
  ) THEN
    ALTER TABLE order_items ADD COLUMN warranty_months integer DEFAULT 0;
  END IF;
  
  -- Discount type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE order_items ADD COLUMN discount_type text DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed'));
  END IF;
  
  -- Discount value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'discount_value'
  ) THEN
    ALTER TABLE order_items ADD COLUMN discount_value decimal(10,2) DEFAULT 0;
  END IF;
  
  -- Assigned technician
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'assigned_technician_id'
  ) THEN
    ALTER TABLE order_items ADD COLUMN assigned_technician_id uuid REFERENCES auth.users(id);
  END IF;
  
  -- Item comment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'item_comment'
  ) THEN
    ALTER TABLE order_items ADD COLUMN item_comment text;
  END IF;
  
  -- Unit cost (for profit calculation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'unit_cost'
  ) THEN
    ALTER TABLE order_items ADD COLUMN unit_cost decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add new columns to orders if they don't exist
DO $$
BEGIN
  -- Technician notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'technician_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN technician_notes text;
  END IF;
  
  -- Client recommendations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'client_recommendations'
  ) THEN
    ALTER TABLE orders ADD COLUMN client_recommendations text;
  END IF;
  
  -- Subtotal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal decimal(10,2) DEFAULT 0;
  END IF;
  
  -- Total discount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'total_discount'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_discount decimal(10,2) DEFAULT 0;
  END IF;
  
  -- Estimated profit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'estimated_profit'
  ) THEN
    ALTER TABLE orders ADD COLUMN estimated_profit decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Create function to calculate item price after discount
CREATE OR REPLACE FUNCTION calculate_item_price_after_discount(
  unit_price decimal,
  quantity integer,
  discount_type text,
  discount_value decimal
) RETURNS decimal AS $$
DECLARE
  subtotal decimal;
  discount_amount decimal;
BEGIN
  subtotal := unit_price * quantity;
  
  IF discount_type = 'percent' THEN
    discount_amount := subtotal * (discount_value / 100);
  ELSE
    discount_amount := discount_value;
  END IF;
  
  RETURN subtotal - discount_amount;
END;
$$ LANGUAGE plpgsql;

-- Create function to update order totals when items change
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
  
  -- Calculate estimated profit (price - cost for all items)
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
  
  -- Update order
  UPDATE orders
  SET 
    subtotal = order_subtotal,
    total_discount = order_discount,
    total_price = order_subtotal - order_discount,
    estimated_profit = order_profit,
    updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_order_totals_trigger ON order_items;

-- Create trigger for order items changes
CREATE TRIGGER update_order_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_totals();