/*
  # Add Order Numbers

  ## Changes
  1. Add order_number column to orders table
  2. Create function to auto-generate order numbers starting from A010
  3. Add trigger to automatically set order_number on insert

  ## Details
  - Order numbers format: A010, A011, A012, etc.
  - Automatically generated on order creation
  - Unique constraint to prevent duplicates
*/

-- Add order_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_number text UNIQUE;
  END IF;
END $$;

-- Create sequence for order numbers starting at 10
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 10;

-- Function to generate next order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  order_num text;
BEGIN
  next_num := nextval('order_number_seq');
  order_num := 'A' || LPAD(next_num::text, 3, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set order_number before insert
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number_trigger ON orders;
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Update existing orders with order numbers
DO $$
DECLARE
  order_rec RECORD;
BEGIN
  FOR order_rec IN 
    SELECT id FROM orders WHERE order_number IS NULL ORDER BY created_at
  LOOP
    UPDATE orders 
    SET order_number = generate_order_number() 
    WHERE id = order_rec.id;
  END LOOP;
END $$;
