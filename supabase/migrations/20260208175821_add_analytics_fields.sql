/*
  # Add Analytics and Financial Fields

  ## Overview
  This migration adds fields to support deep analytics, financial tracking, and marketing ROI.

  ## Modified Tables
  
  ### orders
  - `lead_source` (text) - Marketing channel (Google, TikTok, Instagram, Recommendation, Walk-in)
  - `master_id` (uuid) - Reference to assigned master/technician
  - `parts_cost_total` (numeric) - Total cost of parts used
  - `service_price` (numeric) - Price for labor/service only
  - `master_commission` (numeric) - Commission paid to master
  
  ### profiles
  - `commission_rate` (numeric) - Master's commission percentage (0-100)
  
  ## Data Migration
  - Sets default values for existing records
  - Calculates initial parts_cost_total from order_items
  
  ## Notes
  - All financial fields default to 0
  - lead_source defaults to 'Walk-in'
  - commission_rate defaults to 20% for technicians
*/

-- Add lead_source to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'lead_source'
  ) THEN
    ALTER TABLE orders ADD COLUMN lead_source text DEFAULT 'Walk-in';
    CREATE INDEX IF NOT EXISTS idx_orders_lead_source ON orders(lead_source);
  END IF;
END $$;

-- Add master_id to orders (separate from assigned_to for analytics)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'master_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN master_id uuid REFERENCES profiles(id);
    UPDATE orders SET master_id = assigned_to WHERE assigned_to IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_master_id ON orders(master_id);
  END IF;
END $$;

-- Add parts_cost_total to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'parts_cost_total'
  ) THEN
    ALTER TABLE orders ADD COLUMN parts_cost_total numeric DEFAULT 0;
  END IF;
END $$;

-- Add service_price to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'service_price'
  ) THEN
    ALTER TABLE orders ADD COLUMN service_price numeric DEFAULT 0;
  END IF;
END $$;

-- Add master_commission to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'master_commission'
  ) THEN
    ALTER TABLE orders ADD COLUMN master_commission numeric DEFAULT 0;
  END IF;
END $$;

-- Add commission_rate to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE profiles ADD COLUMN commission_rate numeric DEFAULT 20 CHECK (commission_rate >= 0 AND commission_rate <= 100);
  END IF;
END $$;

-- Calculate initial parts_cost_total for existing orders from order_items
UPDATE orders o
SET parts_cost_total = COALESCE((
  SELECT SUM(oi.unit_cost * oi.quantity)
  FROM order_items oi
  WHERE oi.order_id = o.id AND oi.item_type IN ('part', 'accessory')
), 0)
WHERE parts_cost_total = 0;

-- Calculate initial service_price for existing orders from order_items
UPDATE orders o
SET service_price = COALESCE((
  SELECT SUM(oi.unit_price * oi.quantity)
  FROM order_items oi
  WHERE oi.order_id = o.id AND oi.item_type = 'service'
), 0)
WHERE service_price = 0;

-- Create function to auto-update order analytics fields
CREATE OR REPLACE FUNCTION update_order_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update parts_cost_total
  UPDATE orders
  SET parts_cost_total = COALESCE((
    SELECT SUM(oi.unit_cost * oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = NEW.order_id AND oi.item_type IN ('part', 'accessory')
  ), 0)
  WHERE id = NEW.order_id;
  
  -- Update service_price
  UPDATE orders
  SET service_price = COALESCE((
    SELECT SUM(oi.unit_price * oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = NEW.order_id AND oi.item_type = 'service'
  ), 0)
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update on order_items changes
DROP TRIGGER IF EXISTS trigger_update_order_analytics ON order_items;
CREATE TRIGGER trigger_update_order_analytics
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_analytics();

-- Create function to calculate and update master commission
CREATE OR REPLACE FUNCTION calculate_master_commission()
RETURNS TRIGGER AS $$
DECLARE
  master_rate numeric;
BEGIN
  -- Get master's commission rate
  SELECT commission_rate INTO master_rate
  FROM profiles
  WHERE id = NEW.master_id;
  
  -- Calculate commission based on service price
  IF master_rate IS NOT NULL AND NEW.service_price > 0 THEN
    NEW.master_commission := (NEW.service_price * master_rate / 100);
  ELSE
    NEW.master_commission := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate commission
DROP TRIGGER IF EXISTS trigger_calculate_master_commission ON orders;
CREATE TRIGGER trigger_calculate_master_commission
  BEFORE INSERT OR UPDATE OF service_price, master_id ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_master_commission();

-- Add comments for documentation
COMMENT ON COLUMN orders.lead_source IS 'Marketing channel: Google, TikTok, Instagram, Recommendation, Walk-in';
COMMENT ON COLUMN orders.master_id IS 'Master/technician who performed the work';
COMMENT ON COLUMN orders.parts_cost_total IS 'Total cost price of all parts and accessories used';
COMMENT ON COLUMN orders.service_price IS 'Price charged for labor/service only';
COMMENT ON COLUMN orders.master_commission IS 'Commission amount paid to the master (auto-calculated)';
COMMENT ON COLUMN profiles.commission_rate IS 'Master commission percentage (0-100)';
