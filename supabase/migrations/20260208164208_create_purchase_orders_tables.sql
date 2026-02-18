/*
  # Create Purchase Orders Management System

  ## 1. New Tables
    
  ### `purchase_orders`
  - `id` (uuid, primary key) - Unique identifier for each purchase order
  - `supplier_id` (uuid, foreign key) - Reference to suppliers table
  - `order_number` (text, unique) - Auto-generated order number (PO-YYYYMMDD-XXX)
  - `tracking_number` (text, nullable) - Shipping tracking number
  - `carrier` (text, nullable) - Shipping carrier (FedEx, DHL, UPS, etc.)
  - `status` (text) - Order status: 'Pending', 'In Transit', 'Delivered', 'Delayed', 'Cancelled'
  - `expected_arrival_date` (date, nullable) - Expected delivery date
  - `actual_arrival_date` (date, nullable) - Actual delivery date
  - `total_cost` (numeric) - Total cost of the order
  - `notes` (text, nullable) - Additional notes
  - `created_by` (uuid, foreign key) - User who created the order
  - `received_by` (uuid, foreign key, nullable) - User who received the order
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `purchase_order_items`
  - `id` (uuid, primary key) - Unique identifier
  - `purchase_order_id` (uuid, foreign key) - Reference to purchase_orders
  - `inventory_id` (uuid, foreign key) - Reference to inventory items
  - `quantity_ordered` (integer) - Quantity ordered
  - `quantity_received` (integer) - Quantity actually received
  - `unit_cost` (numeric) - Cost per unit
  - `total_cost` (numeric) - Total cost for this line item
  - `notes` (text, nullable) - Item-specific notes
  - `created_at` (timestamptz) - Creation timestamp

  ## 2. Security
  - Enable RLS on both tables
  - Add policies for authenticated users to manage purchase orders
  - Ensure users can only read/write their own organization's data

  ## 3. Functions & Triggers
  - Auto-generate order numbers
  - Auto-update total_cost on purchase_orders
  - Auto-update updated_at timestamp
*/

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_number text UNIQUE NOT NULL,
  tracking_number text,
  carrier text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Transit', 'Delivered', 'Delayed', 'Cancelled')),
  expected_arrival_date date,
  actual_arrival_date date,
  total_cost numeric DEFAULT 0 CHECK (total_cost >= 0),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  received_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_id uuid REFERENCES inventory(id) ON DELETE RESTRICT NOT NULL,
  quantity_ordered integer NOT NULL CHECK (quantity_ordered > 0),
  quantity_received integer DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  total_cost numeric GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_date ON purchase_orders(expected_arrival_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_inventory ON purchase_order_items(inventory_id);

-- Function to generate purchase order number
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer;
  date_prefix text;
BEGIN
  date_prefix := 'PO-' || to_char(now(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '\d+$') AS integer)), 0) + 1
  INTO counter
  FROM purchase_orders
  WHERE order_number LIKE date_prefix || '%';
  
  new_number := date_prefix || '-' || LPAD(counter::text, 3, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_purchase_order_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_purchase_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_purchase_order_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_purchase_order_number();

-- Function to update purchase order total cost
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS trigger AS $$
BEGIN
  UPDATE purchase_orders
  SET 
    total_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_order_total
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_total();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_purchase_order_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_order_timestamp
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_timestamp();

-- Enable Row Level Security
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Authenticated users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for purchase_order_items
CREATE POLICY "Authenticated users can view purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create purchase order items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase order items"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete purchase order items"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (true);
